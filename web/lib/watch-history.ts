"use client";

// Cloud watch history (direction B, 2026-07-31) - the signed-in counterpart
// to lib/recently-watched.ts's on-device list, in exactly the shape
// lib/japa-tracking.ts established for japa rounds.
//
// Signed OUT, nothing changes: history stays in localStorage, private, never
// sent anywhere. Signed IN, a watch is recorded to db/schema.sql's
// watch_history table TOO, which is what lets Continue Watching follow a
// devotee from their phone to their laptop. That is a deliberate reversal of
// the site's old "history never leaves this device" promise; the About page
// and the account copy were rewritten in the same change.
//
// Every function follows lib/data.ts's safely() idiom: Supabase unconfigured,
// the table not yet created, or a query failing all degrade to an empty
// result rather than throwing. That matters more than usual here - the table
// does not exist until the owner runs the SQL, and until then a signed-in
// devotee simply keeps seeing their local history.
import { supabase } from "@/lib/supabase";
import type { RecentlyWatchedEntry } from "@/lib/recently-watched";

/** Matches MAX_ENTRIES in recently-watched.ts so both halves show the same
 * depth of history, and keeps the read bounded (free-tier discipline). */
const MAX_ENTRIES = 12;

async function safely<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!supabase) return fallback;
  try {
    return await run();
  } catch (error) {
    console.error("Watch history query failed:", error);
    return fallback;
  }
}

/** Record a watch. Upsert, not insert: re-watching moves the video to the
 * front of the history rather than appending a second row, which mirrors
 * recordWatched()'s local behaviour exactly. */
export async function recordWatchRemote(userId: string, youtubeVideoId: string): Promise<void> {
  await safely(async () => {
    const { error } = await supabase!
      .from("watch_history")
      .upsert(
        { user_id: userId, youtube_video_id: youtubeVideoId, watched_at: new Date().toISOString() },
        { onConflict: "user_id,youtube_video_id" }
      );
    if (error) throw error;
  }, undefined);
}

/** The devotee's recent history, newest first, with video metadata JOINed
 * from `videos` so nothing here can go stale. Returns the same shape the
 * local store uses, so ContinueWatchingShelf and lib/affinity.ts consume one
 * type regardless of where the history came from. */
export async function getRemoteHistory(userId: string): Promise<RecentlyWatchedEntry[]> {
  return safely(async () => {
    const { data, error } = await supabase!
      .from("watch_history")
      .select(
        "youtube_video_id, watched_at, videos!inner(title, thumbnail_url, duration_seconds, category, channels(title))"
      )
      .eq("user_id", userId)
      .order("watched_at", { ascending: false })
      .limit(MAX_ENTRIES);
    if (error) throw error;

    type Row = {
      youtube_video_id: string;
      watched_at: string;
      videos: {
        title: string;
        thumbnail_url: string | null;
        duration_seconds: number | null;
        category: string | null;
        channels: { title: string | null } | null;
      } | null;
    };

    return ((data ?? []) as unknown as Row[])
      .filter((row) => row.videos)
      .map((row) => ({
        youtube_video_id: row.youtube_video_id,
        title: row.videos!.title,
        thumbnail_url: row.videos!.thumbnail_url,
        channel_title: row.videos!.channels?.title ?? null,
        duration_seconds: row.videos!.duration_seconds,
        watched_at: new Date(row.watched_at).getTime(),
        category: row.videos!.category,
      }));
  }, []);
}

/** Push whatever is already on this device up to the account, once, at
 * sign-in. Without this a devotee who has been using Goloka anonymously for
 * months would sign in and watch their history apparently vanish - the row
 * would be empty until they watched something new. Upserts, so anything
 * already on the server wins nothing and loses nothing; ON CONFLICT keeps
 * whichever watched_at the write carries, and local entries are older by
 * definition of "already here". Bounded by MAX_ENTRIES on the local side. */
export async function mergeLocalHistory(
  userId: string,
  local: RecentlyWatchedEntry[]
): Promise<void> {
  if (local.length === 0) return;
  await safely(async () => {
    const rows = local.slice(0, MAX_ENTRIES).map((entry) => ({
      user_id: userId,
      youtube_video_id: entry.youtube_video_id,
      watched_at: new Date(entry.watched_at).toISOString(),
    }));
    // ignoreDuplicates: a video already in the account keeps its server
    // timestamp, because that reflects a real watch on some device; the local
    // copy is only being offered to fill gaps.
    const { error } = await supabase!
      .from("watch_history")
      .upsert(rows, { onConflict: "user_id,youtube_video_id", ignoreDuplicates: true });
    if (error) throw error;
  }, undefined);
}
