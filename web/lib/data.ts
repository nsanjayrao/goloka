// All Supabase reads for the app live here, so pages/components never talk
// to `supabase` directly. Every function is defensive: if Supabase isn't
// configured (no env vars) or a query fails (network blip, empty database),
// it returns an empty/neutral value instead of throwing. That's what lets
// every page render its empty state instead of crashing - see CLAUDE.md's
// "database may be empty or unreachable" requirement.
import { supabase } from "@/lib/supabase";
import type { Channel, DurationBucket, Video } from "@/lib/types";

const VIDEO_COLUMNS = "*, channel:channels(title, handle, thumbnail_url)";

// How many videos a /browse/[category] page loads at a time (both the
// initial server-rendered page and each "Load more" click).
export const CATEGORY_PAGE_SIZE = 20;

// Runs a Supabase query and swallows any error, returning `fallback`
// instead. Centralizing this in one place means each data function below
// stays a plain, readable one-liner rather than repeating try/catch.
async function safely<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!supabase) return fallback;
  try {
    return await run();
  } catch (error) {
    console.error("Supabase query failed:", error);
    return fallback;
  }
}

function durationRange(bucket: DurationBucket): { gte?: number; lt?: number } {
  if (bucket === "short") return { lt: 15 * 60 };
  if (bucket === "medium") return { gte: 15 * 60, lt: 45 * 60 };
  return { gte: 45 * 60 }; // "long"
}

/** The single most recent video across all channels, for the home hero. */
export async function getLatestVideo(): Promise<Video | null> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Video | null;
  }, null);
}

/** The hand-curated "Featured" videos for the home shelf (DESIGN.md #4.2),
 * newest first. If the `featured` column doesn't exist yet (owner hasn't
 * run the schema change), the query errors and `safely` returns [] - so
 * the Featured shelf simply doesn't render until the column is added and a
 * video is flagged. */
export async function getFeaturedVideos(limit: number): Promise<Video[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .eq("featured", true)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}

/** Every channel handle that isn't null, for the sitemap's /channel/[handle]
 * URLs. Bounded - the curated channel list is small. */
export async function getChannelHandles(): Promise<string[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("channels")
      .select("handle")
      .not("handle", "is", null)
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((row: { handle: string }) => row.handle);
  }, []);
}

/** The newest `limit` videos' IDs + dates, for the sitemap's /watch/[id]
 * URLs. Deliberately NOT `getLatestVideos` (which excludes Shorts): Shorts
 * still deserve to be indexed, they just never headline. Light column set. */
export async function getSitemapVideos(
  limit: number
): Promise<{ youtube_video_id: string; published_at: string | null }[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select("youtube_video_id, published_at")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as { youtube_video_id: string; published_at: string | null }[];
  }, []);
}

/** A channel by its handle (the `[handle]` in /channel/[handle]). */
export async function getChannelByHandle(handle: string): Promise<Channel | null> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("channels")
      .select("*")
      .eq("handle", handle)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Channel | null;
  }, null);
}

/** The newest `limit` videos across every channel, for the home hero
 * carousel and the "Top 10 New Arrivals" shelf (DESIGN.md #4). Videos
 * under 2 minutes are excluded (the eligibility rule in DESIGN.md #4.1):
 * a 78vh hero built from a vertical #short is a layout failure no styling
 * can fix. Shorts still appear in category shelves and search - this
 * filter only guards what gets FEATURED. Note `gte` also drops rows with
 * a null duration, which is what we want: an unknown length doesn't earn
 * the hero either. */
export async function getLatestVideos(limit: number): Promise<Video[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .gte("duration_seconds", 120)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}

/**
 * Categories that currently have at least one video, ordered by which has
 * the newest upload first (DESIGN.md #4: "Row order: whichever categories
 * have the newest content first"). We look at the most recent `sampleSize`
 * videos and take each category's first appearance - since the rows are
 * already sorted newest-first, that's exactly the category's newest video.
 */
export async function getCategoriesByRecency(sampleSize = 300): Promise<string[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select("category, published_at")
      .order("published_at", { ascending: false })
      .limit(sampleSize);
    if (error) throw error;

    const seen: string[] = [];
    for (const row of data ?? []) {
      if (!seen.includes(row.category)) seen.push(row.category);
    }
    return seen;
  }, []);
}

/**
 * Every distinct category in the catalog (for the /browse index and the
 * search page's suggestion chips). Uses the `distinct_categories` Postgres
 * function (db/schema.sql) rather than selecting every row's `category`
 * column ourselves - PostgREST has no way to express `select distinct`, and
 * pulling one row per video doesn't scale once the catalog passes
 * PostgREST's default 1000-row response cap.
 */
export async function getAllCategories(): Promise<string[]> {
  return safely(async () => {
    const { data, error } = await supabase!.rpc("distinct_categories");
    if (error) throw error;
    return (data ?? []).map((row: { category: string }) => row.category);
  }, []);
}

/**
 * Number of videos matching `filters` (or every video, if `filters` is
 * omitted). Takes the same shape as `VideoPageFilters` so a /browse/[category]
 * page can show a count that actually matches what's in the grid below it,
 * rather than always the whole category's total regardless of the active
 * channel/duration filter chips.
 */
export async function getVideoCount(filters: Partial<VideoPageFilters> = {}): Promise<number> {
  return safely(async () => {
    let query = supabase!.from("videos").select("*", { count: "exact", head: true });
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.channelId) query = query.eq("channel_id", filters.channelId);
    if (filters.duration) {
      const range = durationRange(filters.duration);
      if (range.gte !== undefined) query = query.gte("duration_seconds", range.gte);
      if (range.lt !== undefined) query = query.lt("duration_seconds", range.lt);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }, 0);
}

/** Newest `limit` videos in a category, for a home page row. */
export async function getVideosByCategory(category: string, limit = 10): Promise<Video[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .eq("category", category)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}

// Every field is optional so this one shape drives two grids: the category
// page (category + optional channel/duration chips) and the channel page
// (channelId only). `getVideosPage`/`getVideoCount` apply whichever
// filters are present.
export type VideoPageFilters = {
  category?: string;
  channelId?: number;
  duration?: DurationBucket;
};

/** One page of videos for the category/channel grids, with optional
 * filters (see `VideoPageFilters`). */
export async function getVideosPage(
  filters: VideoPageFilters,
  offset: number,
  limit: number
): Promise<Video[]> {
  return safely(async () => {
    let query = supabase!.from("videos").select(VIDEO_COLUMNS);

    if (filters.category) query = query.eq("category", filters.category);
    if (filters.channelId) query = query.eq("channel_id", filters.channelId);
    if (filters.duration) {
      const range = durationRange(filters.duration);
      if (range.gte !== undefined) query = query.gte("duration_seconds", range.gte);
      if (range.lt !== undefined) query = query.lt("duration_seconds", range.lt);
    }

    const { data, error } = await query
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}

/** Channels that have at least one video in `category`, for filter chips. */
export async function getChannelsInCategory(
  category: string
): Promise<{ id: number; title: string }[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select("channel:channels(id, title)")
      .eq("category", category)
      .limit(500);
    if (error) throw error;

    const byId = new Map<number, string>();
    for (const row of data ?? []) {
      // Embedded belongs-to relations come back as a single object.
      const channel = row.channel as unknown as { id: number; title: string } | null;
      if (channel) byId.set(channel.id, channel.title);
    }
    return [...byId.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, []);
}

/** A single video by its YouTube ID (the `[id]` in /watch/[id]). */
export async function getVideoByYoutubeId(youtubeVideoId: string): Promise<Video | null> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .eq("youtube_video_id", youtubeVideoId)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Video | null;
  }, null);
}

/** Other videos in the same category, for the "More from this category" row. */
export async function getMoreFromCategory(
  category: string,
  excludeYoutubeVideoId: string,
  limit = 10
): Promise<Video[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .eq("category", category)
      .neq("youtube_video_id", excludeYoutubeVideoId)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}

/** Title search, used by the /search page. Safe to call from the browser. */
export async function searchVideos(query: string, limit = 24): Promise<Video[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return safely(async () => {
    // Escape ilike's own wildcard characters so a literal "%" or "_" in
    // someone's search doesn't act as a pattern wildcard.
    const escaped = trimmed.replace(/[%_]/g, (char) => `\\${char}`);
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .ilike("title", `%${escaped}%`)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}
