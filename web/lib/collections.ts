"use client";

// Shared collections - turning a saved list into ONE link ("Ekadasi lectures
// for Ma") anyone can open, signed in or not. Mirrors lib/saved.ts's
// defensive posture (Supabase not configured / a query failing degrades to
// an empty/neutral result, never a throw) and the "ids then join" approach
// getSavedVideos uses to resolve ids against the public videos table.
import { supabase } from "@/lib/supabase";
import type { Video } from "@/lib/types";

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 10;

// crypto.getRandomValues, not Math.random: the slug IS the access control
// for who can view a collection (public RLS trusts it being unguessable),
// so it needs to come from a cryptographically strong source.
function generateSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (const byte of bytes) {
    slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  }
  return slug;
}

export type SharedCollectionSummary = {
  id: string;
  title: string;
  created_at: string;
};

/** Snapshots `videoIds` under a fresh unguessable slug and returns it (null
 * on failure - Supabase unconfigured, RLS rejection, etc). Collisions are
 * astronomically unlikely at this alphabet/length (36^10), so this doesn't
 * retry on a primary-key conflict. */
export async function createCollection(
  userId: string,
  title: string,
  videoIds: string[]
): Promise<string | null> {
  if (!supabase) return null;
  const id = generateSlug();
  const { error } = await supabase
    .from("shared_collections")
    .insert({ id, owner_id: userId, title: title.trim().slice(0, 80), video_ids: videoIds });
  return error ? null : id;
}

/** The signed-in user's own shared links, newest first, for the "My shared
 * links" list on /library. */
export async function getMyCollections(): Promise<SharedCollectionSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("shared_collections")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as SharedCollectionSummary[];
}

/** Deletes one of the signed-in user's own shared links (RLS scopes this to
 * their own rows regardless). Returns whether it succeeded. */
export async function deleteCollection(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("shared_collections").delete().eq("id", id);
  return !error;
}

/** A public collection by its slug, resolved to full Video rows in the
 * order they were saved. Browser-safe (anon key, public RLS) - used by both
 * the public /c/[id] page (server-side, via lib/data.ts's
 * getSharedCollection) and any client code that wants to preview one.
 * A collection referencing a since-pruned video silently drops it, same
 * as getSavedVideos. */
export async function fetchCollection(
  id: string
): Promise<{ title: string; videos: Video[] } | null> {
  if (!supabase) return null;
  const { data: collection, error } = await supabase
    .from("shared_collections")
    .select("title, video_ids")
    .eq("id", id)
    .maybeSingle();
  if (error || !collection) return null;

  const ids = (collection.video_ids as string[]) ?? [];
  if (ids.length === 0) return { title: collection.title as string, videos: [] };

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("*, channel:channels(title, handle, thumbnail_url)")
    .in("youtube_video_id", ids);
  if (videosError || !videos) return { title: collection.title as string, videos: [] };

  const byId = new Map(videos.map((video) => [video.youtube_video_id, video as unknown as Video]));
  const ordered = ids.map((videoId) => byId.get(videoId)).filter(Boolean) as Video[];
  return { title: collection.title as string, videos: ordered };
}
