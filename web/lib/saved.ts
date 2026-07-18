"use client";

// Saved lists (favourites / watch-later) - the ONLY data an account holds.
// All queries run in the browser with the anon key; RLS (db/schema.sql)
// scopes every read/write to the signed-in user. Errors degrade to empty
// results, matching lib/data.ts's defensive posture.
import { supabase } from "@/lib/supabase";
import type { Video } from "@/lib/types";

export type SavedKind = "favourite" | "watch_later";

/** The signed-in user's saved kinds for ONE video (for the watch-page
 * buttons). Empty set when signed out or on error. */
export async function getSavedKinds(youtubeVideoId: string): Promise<Set<SavedKind>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("saved_videos")
    .select("kind")
    .eq("youtube_video_id", youtubeVideoId);
  if (error || !data) return new Set();
  return new Set(data.map((row) => row.kind as SavedKind));
}

/** Toggle one saved row. Returns the new on/off state (or null on error,
 * so callers can roll back an optimistic update). */
export async function toggleSaved(
  userId: string,
  youtubeVideoId: string,
  kind: SavedKind,
  on: boolean
): Promise<boolean | null> {
  if (!supabase) return null;
  if (on) {
    const { error } = await supabase
      .from("saved_videos")
      .upsert(
        { user_id: userId, youtube_video_id: youtubeVideoId, kind },
        { onConflict: "user_id,youtube_video_id,kind" }
      );
    return error ? null : true;
  }
  const { error } = await supabase
    .from("saved_videos")
    .delete()
    .eq("youtube_video_id", youtubeVideoId)
    .eq("kind", kind);
  return error ? null : false;
}

/** One saved list as full Video rows, newest-saved first. Two bounded
 * queries: the user's ids (RLS-scoped), then the public videos rows. A
 * saved video that has left the catalog is silently skipped. */
export async function getSavedVideos(kind: SavedKind, limit = 60): Promise<Video[]> {
  if (!supabase) return [];
  const { data: saved, error } = await supabase
    .from("saved_videos")
    .select("youtube_video_id")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !saved || saved.length === 0) return [];

  const ids = saved.map((row) => row.youtube_video_id);
  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("*, channel:channels(title, handle, thumbnail_url)")
    .in("youtube_video_id", ids);
  if (videosError || !videos) return [];

  // Restore the saved order (the .in() query returns table order).
  const byId = new Map(videos.map((video) => [video.youtube_video_id, video as unknown as Video]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as Video[];
}
