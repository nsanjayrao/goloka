-- Goloka database schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

create table if not exists channels (
  id bigint generated always as identity primary key,
  youtube_channel_id text unique,
  handle text unique,
  title text,
  thumbnail_url text,
  default_category text not null default 'General',
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id bigint generated always as identity primary key,
  youtube_video_id text not null unique,
  channel_id bigint references channels(id) on delete cascade,
  title text not null,
  description text,
  published_at timestamptz,
  duration_seconds integer,
  thumbnail_url text,
  category text not null default 'General',
  language text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Hand-curated "Featured" flag (owner ticks this in the Supabase table
-- editor). The sync worker never sends this column, so a re-sync leaves
-- curation untouched. `add column if not exists` keeps this file safe to
-- re-run. The partial index only stores the rare `true` rows, so the
-- featured-shelf query stays cheap as the catalog grows.
alter table videos add column if not exists featured boolean not null default false;

create index if not exists videos_category_idx on videos (category);
create index if not exists videos_published_idx on videos (published_at desc);
create index if not exists videos_channel_idx on videos (channel_id);
create index if not exists videos_featured_idx on videos (published_at desc) where featured;

-- ---------------------------------------------------------------------------
-- Discovery upgrade (Phase 0). Additive + idempotent, safe to re-run.
-- ---------------------------------------------------------------------------

-- Popularity signal: the video's YouTube view count. The sync worker fills
-- this from the `statistics` part of the videos endpoint (Phase 1); existing
-- rows stay null until the next enrich pass, so `nulls last` keeps unranked
-- videos out of the way in "Most Watched" sorts.
alter table videos add column if not exists view_count bigint;
create index if not exists videos_view_count_idx on videos (view_count desc nulls last);

-- Category pages list a single category newest-first; this composite serves
-- that ordering directly (the standalone category/published indexes above
-- can't be combined for it).
create index if not exists videos_category_published_idx on videos (category, published_at desc);

-- Full-text search vector over title + description, replacing the current
-- `title ILIKE '%q%'` scan (Phase 3). The 'simple' config does NO stemming,
-- which suits a catalog full of transliterated names (Radharani, Damodara,
-- Vrindavan) where English stemming would only hurt. The two-argument
-- `to_tsvector(regconfig, text)` form is IMMUTABLE (unlike the one-argument
-- form, which depends on a session setting), so it is valid in a generated
-- column. STORED means Postgres keeps it in sync on every insert/update.
alter table videos add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored;
create index if not exists videos_search_tsv_idx on videos using gin (search_tsv);

-- Topic collections (2026-07-13): the sync worker writes LLM-judged topic
-- slugs (worker/sync.py TOPIC_DEFS, mirroring web/lib/topics.ts) into the
-- `tags` jsonb array, and /topic/* queries it with the jsonb containment
-- operator (tags @> '["radharani"]'). jsonb_path_ops GIN is the smaller,
-- faster index variant that serves exactly that operator.
create index if not exists videos_tags_idx on videos using gin (tags jsonb_path_ops);

-- Live darshans (Midnight redesign, 2026-07-12): powers the home page's
-- "Live from the dhāma" strip. Defaults mean "not live", so the strip simply
-- doesn't render until the sync worker starts marking live streams (worker
-- support is a follow-up - see docs/DESIGN.md #5.6). The partial index only
-- stores the rare live rows, so the strip's query stays near-free.
alter table videos add column if not exists is_live boolean not null default false;
alter table videos add column if not exists live_viewer_count integer;
create index if not exists videos_is_live_idx on videos (published_at desc) where is_live;

-- Accounts (Phase 4, 2026-07-18): optional sign-in (Google via Supabase
-- Auth) whose ONLY data is the user's saved lists - favourites and
-- watch-later. Watch HISTORY stays in the browser (localStorage) by design;
-- the account never sees it. No FK to videos: a saved id survives catalog
-- pruning, and the frontend joins by youtube_video_id at read time.
create table if not exists saved_videos (
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_video_id text not null,
  kind text not null check (kind in ('favourite', 'watch_later')),
  created_at timestamptz not null default now(),
  primary key (user_id, youtube_video_id, kind)
);
create index if not exists saved_videos_user_idx
  on saved_videos (user_id, kind, created_at desc);

-- RLS: a signed-in user sees and edits ONLY their own rows; the anon role
-- sees nothing. auth.uid() comes from the JWT the browser sends.
alter table saved_videos enable row level security;
drop policy if exists "select own saved" on saved_videos;
create policy "select own saved" on saved_videos
  for select using (auth.uid() = user_id);
drop policy if exists "insert own saved" on saved_videos;
create policy "insert own saved" on saved_videos
  for insert with check (auth.uid() = user_id);
drop policy if exists "delete own saved" on saved_videos;
create policy "delete own saved" on saved_videos
  for delete using (auth.uid() = user_id);

-- Anyone may read (the site is public); only the service key (sync worker) may write.
alter table channels enable row level security;
alter table videos enable row level security;

drop policy if exists "public read channels" on channels;
create policy "public read channels" on channels for select using (true);

drop policy if exists "public read videos" on videos;
create policy "public read videos" on videos for select using (true);

-- The frontend needs the distinct list of categories (for /browse and the
-- search page's suggestion chips) - PostgREST/supabase-js can't express
-- `select distinct` directly, and pulling every row's `category` column
-- client-side doesn't scale once the catalog grows past PostgREST's
-- default 1000-row cap. This RPC does the DISTINCT in Postgres instead.
-- `security invoker` (the default) means it runs as whichever role calls
-- it, so the "public read videos" RLS policy above still applies.
create or replace function distinct_categories()
returns table (category text)
language sql
stable
as $$
  select distinct category from videos order by category;
$$;

grant execute on function distinct_categories() to anon, authenticated;

-- Relevance-ranked search (Tier 1 discovery upgrade). The plain
-- `search_tsv @@ tsquery` match in web/lib/data.ts's searchVideos() orders by
-- recency, not how well a video matches the query - PostgREST/supabase-js
-- can't order by a computed ts_rank() expression on a table query (it isn't a
-- real column and the query varies per search), so that needs an RPC.
-- `search_query` must already be valid tsquery syntax (the frontend already
-- builds one, e.g. "krishna:* & prasadam:*" - see toPrefixTsQuery in
-- lib/data.ts). Returns the channel join as flat `channel_*` columns since a
-- SQL function can't produce PostgREST's automatic embedded-relation shape;
-- lib/data.ts's searchVideos() reassembles them into the nested `channel`
-- object the rest of the app expects. `security invoker` (the default) keeps
-- the "public read videos"/"public read channels" RLS policies in effect.
create or replace function search_videos_ranked(search_query text, result_limit int default 24)
returns table (
  id bigint,
  youtube_video_id text,
  channel_id bigint,
  title text,
  description text,
  published_at timestamptz,
  duration_seconds integer,
  view_count bigint,
  thumbnail_url text,
  category text,
  language text,
  tags jsonb,
  featured boolean,
  created_at timestamptz,
  channel_title text,
  channel_handle text,
  channel_thumbnail_url text
)
language sql
stable
as $$
  select
    v.id, v.youtube_video_id, v.channel_id, v.title, v.description, v.published_at,
    v.duration_seconds, v.view_count, v.thumbnail_url, v.category, v.language, v.tags,
    v.featured, v.created_at,
    c.title, c.handle, c.thumbnail_url
  from videos v
  left join channels c on c.id = v.channel_id
  where v.search_tsv @@ to_tsquery('simple', search_query)
  order by ts_rank(v.search_tsv, to_tsquery('simple', search_query)) desc,
           v.published_at desc nulls last
  limit result_limit;
$$;

grant execute on function search_videos_ranked(text, int) to anon, authenticated;

-- Shared collections (Phase 4 follow-up, 2026-07-19): a signed-in devotee
-- turns one of their saved lists into a single link ("Ekadasi lectures for
-- Ma") anyone can open, signed in or not. `id` is a 10-char unguessable slug
-- generated client-side from crypto.getRandomValues (web/lib/collections.ts)
-- rather than a serial/uuid primary key, so the public URL IS the primary
-- key - no separate lookup column. `video_ids` is a plain jsonb array of
-- youtube_video_id strings (same "no FK, join at read time" choice as
-- saved_videos above): a collection referencing a since-pruned video simply
-- renders what's left instead of ever breaking.
create table if not exists shared_collections (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 80),
  video_ids jsonb not null check (jsonb_typeof(video_ids) = 'array'),
  created_at timestamptz not null default now()
);
create index if not exists shared_collections_owner_idx
  on shared_collections (owner_id, created_at desc);

-- RLS: the whole point is a link that works for anyone, signed in or not -
-- so SELECT is public. Only the owner may INSERT (as themselves) or DELETE
-- their own rows. Deliberately NO update policy: a shared collection is an
-- immutable snapshot of what was on the list at share time. That's simpler
-- (no "who can edit a link already in someone's WhatsApp chat" question) and
-- more abuse-resistant (nobody can silently swap a link's contents after
-- it's been shared).
alter table shared_collections enable row level security;
drop policy if exists "public read shared collections" on shared_collections;
create policy "public read shared collections" on shared_collections
  for select using (true);
drop policy if exists "insert own shared collections" on shared_collections;
create policy "insert own shared collections" on shared_collections
  for insert with check (auth.uid() = owner_id);
drop policy if exists "delete own shared collections" on shared_collections;
create policy "delete own shared collections" on shared_collections
  for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Web push (opt-in notifications, 2026-07-19): "Today is Yogini Ekadashi"
-- and "ISKCON Vrindavan is live". Zero third-party push service (raw Web
-- Push via VAPID - see web/lib/push.ts) and zero identity: a subscription
-- row is just the browser's push endpoint + the two keys the Push API
-- hands back, with no user id, email, or auth.uid() anywhere near it.
-- `endpoint` (the push service URL the browser was issued) is the natural
-- primary key - it's already unique per browser+origin+push-service.
-- ---------------------------------------------------------------------------
create table if not exists push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  -- Which notification kinds this browser wants. The <@ (jsonb "is
  -- contained in") check enforces the only two valid topics without a
  -- separate lookup table - anything outside this pair is rejected at
  -- insert time rather than silently stored and silently never sent.
  topics jsonb not null default '["festivals"]'::jsonb
    check (topics <@ '["festivals","live"]'::jsonb),
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

-- Lets the worker query "who wants festival pushes" / "who wants live
-- pushes" with an index instead of a full scan as subscribers grow.
create index if not exists push_subscriptions_topics_idx
  on push_subscriptions using gin (topics jsonb_path_ops);

-- RLS reasoning (this table is intentionally NOT public-readable, unlike
-- channels/videos above):
-- - INSERT: anon may insert freely. There is no auth.uid() to scope
--   by - subscribing is anonymous by design - so the browser's own
--   pushManager.subscribe() call is the only gate that matters upstream.
-- - DELETE: anon may delete by endpoint. The browser only ever knows its
--   OWN endpoint (it's an opaque URL from the Push API, never listed or
--   guessable), so "delete the row whose endpoint I possess" IS
--   self-service unsubscribe - the same trust model as a bearer token.
-- - SELECT: no anon policy at all, on purpose. p256dh/auth are the keys
--   that let anyone push-spam that browser, so subscriptions are
--   write-only from the client; only the service key (the sync worker,
--   which bypasses RLS entirely) ever reads this table, to fan out a
--   notification and prune dead endpoints on 404/410.
alter table push_subscriptions enable row level security;

drop policy if exists "anon insert own subscription" on push_subscriptions;
create policy "anon insert own subscription" on push_subscriptions
  for insert to anon with check (true);

drop policy if exists "anon delete own subscription" on push_subscriptions;
create policy "anon delete own subscription" on push_subscriptions
  for delete to anon using (true);

-- ---------------------------------------------------------------------------
-- Sādhana dashboard (2026-07-21): a signed-in devotee's own record of japa
-- rounds chanted, by day - the cloud counterpart to the on-device "rounds
-- today" counter in web/lib/rounds.ts. Signed OUT, rounds stay
-- localStorage-only exactly as before (rounds.ts is untouched by this
-- change); signed IN, each completed round also upserts here, at the
-- devotee's own choice - that is the whole point of signing in for
-- chanting. This table is the ONLY place a devotee's own sādhana is kept,
-- kept only because they chose to sign in, and deleted the instant their
-- account is - nothing here outlives that choice.
-- ---------------------------------------------------------------------------
create table if not exists japa_rounds (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The LOCAL calendar day the rounds were chanted (not a timestamptz) -
  -- like rounds.ts's todayKey(), a devotee's "today" is their own clock,
  -- never some server's UTC day.
  day date not null,
  rounds integer not null default 0 check (rounds >= 0),
  -- Which mantra was chanted (the chant redesign adds mantra choice - see
  -- CLAUDE.md team workflow). Primary-key columns can never be NULL in
  -- Postgres (unlike a plain UNIQUE constraint, where every NULL sorts as
  -- distinct and would let duplicate "no mantra" rows pile up for the same
  -- day), so the default mantra is the sentinel 'maha_mantra' rather than
  -- NULL. web/lib/japa-tracking.ts always passes an explicit mantra id
  -- defaulting to this same sentinel, so one calendar day of default japa
  -- always upserts into exactly one row.
  mantra text not null default 'maha_mantra',
  updated_at timestamptz not null default now(),
  primary key (user_id, day, mantra)
);
create index if not exists japa_rounds_user_day_idx
  on japa_rounds (user_id, day);

-- RLS: a devotee's chanting record is theirs alone - no public read, ever
-- (unlike channels/videos above). Only the signed-in owner may see or
-- change their own rows; the anon role sees nothing.
alter table japa_rounds enable row level security;
drop policy if exists "select own japa rounds" on japa_rounds;
create policy "select own japa rounds" on japa_rounds
  for select using (auth.uid() = user_id);
drop policy if exists "insert own japa rounds" on japa_rounds;
create policy "insert own japa rounds" on japa_rounds
  for insert with check (auth.uid() = user_id);
drop policy if exists "update own japa rounds" on japa_rounds;
create policy "update own japa rounds" on japa_rounds
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own japa rounds" on japa_rounds;
create policy "delete own japa rounds" on japa_rounds
  for delete using (auth.uid() = user_id);

-- Records one completed round as an atomic upsert-increment of today's row,
-- avoiding the read-then-write race a plain client-side upsert would have
-- (two rounds finished in quick succession could otherwise both read
-- "rounds=5" and both write "rounds=6", silently losing one). `security
-- invoker` (the default) means it runs as the calling (authenticated) role,
-- so the RLS policies above still gate it - a devotee can only ever
-- increment their OWN row, never anyone else's, regardless of what
-- p_day/p_mantra is passed.
create or replace function increment_japa_round(p_day date, p_mantra text default 'maha_mantra')
returns void
language sql
security invoker
as $$
  insert into japa_rounds (user_id, day, mantra, rounds, updated_at)
  values (auth.uid(), p_day, coalesce(p_mantra, 'maha_mantra'), 1, now())
  on conflict (user_id, day, mantra)
  do update set rounds = japa_rounds.rounds + 1, updated_at = now();
$$;

grant execute on function increment_japa_round(date, text) to authenticated;

-- The signed-in devotee's own total rounds for one calendar year, summed in
-- Postgres rather than pulled row-by-row to the client - the dashboard's
-- "this year" figure needs only the sum, and a devotee who chants daily for
-- a full year would otherwise mean shipping ~365+ rows just to add them up.
-- `security invoker` + RLS again means this can only ever see the caller's
-- own rows.
create or replace function japa_year_total(p_year int)
returns integer
language sql
security invoker
as $$
  select coalesce(sum(rounds), 0)::int
  from japa_rounds
  where user_id = auth.uid()
    and day >= make_date(p_year, 1, 1)
    and day <= make_date(p_year, 12, 31);
$$;

grant execute on function japa_year_total(int) to authenticated;
