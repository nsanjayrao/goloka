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
