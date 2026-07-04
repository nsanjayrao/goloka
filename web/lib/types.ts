// Mirrors db/schema.sql. Keep these two types in sync with the database -
// there's no ORM generating them for us, so it's a manual contract.

export type Channel = {
  id: number;
  youtube_channel_id: string;
  handle: string | null;
  title: string;
  thumbnail_url: string | null;
  default_category: string;
  created_at: string;
};

// A video row joined with its channel's title (we almost always need both,
// so `lib/data.ts` fetches them together instead of making two round trips).
export type Video = {
  id: number;
  youtube_video_id: string;
  channel_id: number;
  title: string;
  description: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  category: string;
  language: string | null;
  tags: string[];
  featured: boolean;
  created_at: string;
  channel: {
    title: string;
    handle: string | null;
    thumbnail_url: string | null;
  } | null;
};

export type DurationBucket = "short" | "medium" | "long";
