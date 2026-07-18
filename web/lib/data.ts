// All Supabase reads for the app live here, so pages/components never talk
// to `supabase` directly. Every function is defensive: if Supabase isn't
// configured (no env vars) or a query fails (network blip, empty database),
// it returns an empty/neutral value instead of throwing. That's what lets
// every page render its empty state instead of crashing - the app-wide
// "database may be empty or unreachable" requirement.
import { expandQueryWord } from "@/lib/search-expansion";
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

// Builds a PostgREST OR filter matching videos whose TITLE contains any of
// `keywords` (case-insensitive). Powers topic collections like
// /topic/radharani - a "topic" is just a saved title search over the catalog,
// so it needs no schema change and grows as new videos sync. Note PostgREST
// uses `*` (not `%`) as the wildcard inside an or() filter string.
function titleKeywordFilter(keywords: string[]): string {
  return keywords.map((keyword) => `title.ilike.*${keyword}*`).join(",");
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

/** Currently-live streams for the home "Live from the dhāma" strip
 * (DESIGN.md #5.6), newest first. Until the owner re-runs db/schema.sql,
 * the `is_live` column doesn't exist - Postgres reports that as error
 * 42703 (undefined_column), which is an EXPECTED state here, not a
 * failure: return [] quietly (no console.error spamming the dev overlay)
 * and the strip simply doesn't render. Any other error still goes through
 * `safely`'s normal log-and-fallback path. */
export async function getLiveVideos(limit = 6): Promise<Video[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .eq("is_live", true)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (error.code === "42703") return [];
      throw error;
    }
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

/** The curated "Spiritual Leaders" (lib/speakers.ts) that actually exist in
 * the channels table, each with its indexed video count, sorted by that
 * count descending (the most prolific teacher's catalog leads). One query
 * for all the channel rows, then one small COUNT per channel in parallel -
 * bounded by SPEAKER_HANDLES' length (well under free-tier concern). */
export async function getSpeakerChannels(
  handles: string[]
): Promise<{ channel: Channel; videoCount: number }[]> {
  return safely(async () => {
    const { data, error } = await supabase!.from("channels").select("*").in("handle", handles);
    if (error) throw error;
    const channels = (data ?? []) as unknown as Channel[];

    const withCounts = await Promise.all(
      channels.map(async (channel) => ({
        channel,
        videoCount: await getVideoCount({ channelId: channel.id }),
      }))
    );
    return withCounts.sort((a, b) => b.videoCount - a.videoCount);
  }, []);
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

/** The most-viewed videos across the catalog, for the home "Most Watched"
 * shelf. Excludes Shorts (<2 min), which otherwise dominate on raw view
 * count; `view_count` is null for un-enriched rows, so nulls sort last. */
export async function getPopularVideos(limit: number): Promise<Video[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .gte("duration_seconds", 120)
      .order("view_count", { ascending: false, nullsFirst: false })
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
    if (filters.language) query = query.eq("language", filters.language);
    if (filters.duration) {
      const range = durationRange(filters.duration);
      if (range.gte !== undefined) query = query.gte("duration_seconds", range.gte);
      if (range.lt !== undefined) query = query.lt("duration_seconds", range.lt);
    }
    if (filters.titleKeywords?.length) query = query.or(titleKeywordFilter(filters.titleKeywords));
    if (filters.topicSlug) query = query.contains("tags", JSON.stringify([filters.topicSlug]));
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
  /** Exact match on the `language` column (see getLanguagesInCategory). */
  language?: string;
  /** Match videos whose TITLE contains any of these keywords (OR of ILIKEs).
   * Legacy topic mechanism - substring matching false-positives (e.g.
   * "radha" inside "aradhana"), so topic collections now use `topicSlug`;
   * this stays for any ad-hoc keyword shelf. */
  titleKeywords?: string[];
  /** Match videos the sync worker tagged with this topic slug (the `tags`
   * jsonb column - see worker/sync.py TOPIC_DEFS). LLM-judged "aboutness",
   * not substring luck: drives /topic/* and the home topic shelves. */
  topicSlug?: string;
  /** Order: "recent" (published_at, default) or "popular" (view_count). */
  sort?: "recent" | "popular";
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
    if (filters.language) query = query.eq("language", filters.language);
    if (filters.duration) {
      const range = durationRange(filters.duration);
      if (range.gte !== undefined) query = query.gte("duration_seconds", range.gte);
      if (range.lt !== undefined) query = query.lt("duration_seconds", range.lt);
    }
    if (filters.titleKeywords?.length) query = query.or(titleKeywordFilter(filters.titleKeywords));
    if (filters.topicSlug) query = query.contains("tags", JSON.stringify([filters.topicSlug]));

    const { data, error } = await query
      .order(filters.sort === "popular" ? "view_count" : "published_at", {
        ascending: false,
        nullsFirst: false,
      })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}

/** Languages present in `category` (its videos' `language` column, populated
 * by the worker's Groq classification - see worker/sync.py's
 * normalize_language), for filter chips. Bounded client-side dedup rather
 * than a Postgres RPC (same approach as getChannelsInCategory below) - the
 * language set is small (a couple dozen real-world languages at most), so a
 * few thousand rows comfortably covers it without a schema change. */
export async function getLanguagesInCategory(category: string): Promise<string[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("videos")
      .select("language")
      .eq("category", category)
      .not("language", "is", null)
      .limit(3000);
    if (error) throw error;
    // Junk guard: historical rows have carried literal "null"/"unknown"
    // strings and raw 2-letter codes as languages - the worker normalizes
    // at write time now, but a chip list should never trust old data.
    const JUNK = new Set(["null", "none", "unknown", "n/a", ""]);
    const seen = new Set<string>();
    for (const row of data ?? []) {
      const language = (row.language as string).trim();
      if (!JUNK.has(language.toLowerCase()) && language.length > 2) seen.add(language);
    }
    return [...seen].sort();
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

// Turns free-typed input into a prefix tsquery ("krishna prasadam" ->
// "krishna:* & prasadam:*"), so a debounced search-as-you-type box still
// matches on partial words. Postgres tsquery syntax reserves & | ! ( ) : *,
// so those are stripped out of each word (and every expanded variant, since
// a stray one of those characters could in principle ride along in a
// variant) first - a lone "&" etc. would otherwise be a syntax error, not a
// literal search term.
//
// Each word additionally goes through expandQueryWord (lib/search-expansion)
// before being turned into tsquery syntax: "ekādaśī" doesn't just become
// "ekādaśī:*", it becomes a parenthesized OR of every spelling worth trying -
// "(ekadashi:* | ekadasi:* | एकादशी:* | ...)" - so a visitor typing in IAST,
// plain Latin, or Devanagari all reach the same videos. Postgres's tsquery
// grammar accepts a parenthesized "|" group as a single term, so this
// composes with the existing "&" between words without any RPC/schema change
// (see search_videos_ranked in db/schema.sql, which just passes this string
// straight to to_tsquery('simple', ...)).
//
// Exported (not just used internally) so search-expansion.test.ts can assert
// on the exact tsquery string end-to-end, rather than re-implementing this
// assembly logic a second time in the test file.
export function toPrefixTsQuery(input: string): string {
  const stripReserved = (word: string) => word.replace(/[&|!():*]/g, "");

  return input
    .trim()
    .split(/\s+/)
    .map(stripReserved)
    .filter(Boolean)
    .map((word) => {
      const variants = [...expandQueryWord(word)].map(stripReserved).filter(Boolean);
      if (variants.length === 0) return "";
      if (variants.length === 1) return `${variants[0]}:*`;
      return `(${variants.map((variant) => `${variant}:*`).join(" | ")})`;
    })
    .filter(Boolean)
    .join(" & ");
}

// The `search_videos_ranked` RPC (db/schema.sql) can't return PostgREST's
// automatic embedded-relation shape, so it comes back with flat `channel_*`
// columns instead of a nested `channel` object - this reassembles it into
// the shape the rest of the app (VideoCard etc.) expects.
type RankedSearchRow = Omit<Video, "channel"> & {
  channel_title: string | null;
  channel_handle: string | null;
  channel_thumbnail_url: string | null;
};

function rankedRowToVideo(row: RankedSearchRow): Video {
  const { channel_title, channel_handle, channel_thumbnail_url, ...rest } = row;
  return {
    ...rest,
    channel: channel_title === null ? null : {
      title: channel_title,
      handle: channel_handle,
      thumbnail_url: channel_thumbnail_url,
    },
  };
}

/** Full-text search over title + description (the generated `search_tsv`
 * column, db/schema.sql), used by the /search page. Safe to call from the
 * browser. Matches whole word-prefixes rather than arbitrary substrings
 * (standard search-box behavior).
 *
 * Tries the `search_videos_ranked` RPC first (relevance-ordered via
 * ts_rank - see db/schema.sql); if that RPC hasn't been added to the
 * database yet (schema.sql is run manually - there is no migration
 * tooling), falls back to a plain recency-ordered search_tsv
 * match, so search keeps working either way and silently upgrades to
 * relevance ranking the moment the migration is applied. */
export async function searchVideos(query: string, limit = 24): Promise<Video[]> {
  const tsQuery = toPrefixTsQuery(query);
  if (!tsQuery) return [];
  return safely(async () => {
    const ranked = await supabase!.rpc("search_videos_ranked", {
      search_query: tsQuery,
      result_limit: limit,
    });
    if (!ranked.error && ranked.data) {
      return (ranked.data as RankedSearchRow[]).map(rankedRowToVideo);
    }

    const { data, error } = await supabase!
      .from("videos")
      .select(VIDEO_COLUMNS)
      .textSearch("search_tsv", tsQuery, { config: "simple" })
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as Video[];
  }, []);
}
