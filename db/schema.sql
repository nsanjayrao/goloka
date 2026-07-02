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

create index if not exists videos_category_idx on videos (category);
create index if not exists videos_published_idx on videos (published_at desc);
create index if not exists videos_channel_idx on videos (channel_id);

-- Anyone may read (the site is public); only the service key (sync worker) may write.
alter table channels enable row level security;
alter table videos enable row level security;

drop policy if exists "public read channels" on channels;
create policy "public read channels" on channels for select using (true);

drop policy if exists "public read videos" on videos;
create policy "public read videos" on videos for select using (true);
