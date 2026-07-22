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
  view_count: number | null;
  thumbnail_url: string | null;
  category: string;
  language: string | null;
  tags: string[];
  featured: boolean;
  /** Optional: these two exist only once the owner re-runs db/schema.sql
   * (the 2026-07-12 live-darshan columns) - older databases return rows
   * without them, so treat `undefined` as "not live". */
  is_live?: boolean;
  live_viewer_count?: number | null;
  created_at: string;
  channel: {
    title: string;
    handle: string | null;
    thumbnail_url: string | null;
  } | null;
};

export type DurationBucket = "short" | "medium" | "long";

// A channel's own YouTube playlist, indexed as a "series" (2026-07-22) so a
// devotee landing mid-series can reach episode 1 without leaving Goloka.
// Mirrors db/schema.sql's `playlists`.
export type Series = {
  id: number;
  youtube_playlist_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  /** YouTube's full item count - may exceed the episodes we have indexed
   * (Shorts and unindexed items keep their slots but get no link). */
  item_count: number;
  channel: {
    title: string;
    handle: string | null;
  } | null;
};

/** One indexed episode of a series, in playlist order. `position` is the
 * TRUE 0-based slot in the YouTube playlist (gaps possible). */
export type SeriesEpisode = {
  position: number;
  video: Video;
};

/** What the watch page needs to say "Part 10 of 24" and walk the series:
 * where this video sits, and its nearest indexed neighbours. */
export type SeriesContext = {
  series: Series;
  /** This video's true 0-based playlist position (display as position + 1). */
  position: number;
  prev: Video | null;
  next: Video | null;
};
