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
