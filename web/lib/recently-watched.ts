// "Continue Watching" (Tier 3): a personalized homepage row with zero
// backend and zero accounts - watch history lives ONLY in the visitor's own
// browser (localStorage), never sent to or read by the server. This is what
// keeps it consistent with the site's no-user-data stance (see About) while
// still giving a real returning-visitor convenience.
import type { Video } from "@/lib/types";

const STORAGE_KEY = "goloka:recently-watched";
const MAX_ENTRIES = 12;

export type RecentlyWatchedEntry = {
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  channel_title: string | null;
  duration_seconds: number | null;
  watched_at: number; // Date.now(), used only to order entries
  /** The video's category at watch time - feeds the "Because you watched"
   * affinity (lib/affinity.ts). Optional: entries recorded before this
   * field existed simply don't contribute, no migration needed. */
  category?: string | null;
  /** Seconds into the video, for resuming. Optional for the same reason:
   * entries written before resume existed, or watched without the YouTube
   * IFrame API available, simply have no position and start from zero. */
  position_seconds?: number | null;
};

/** Most-recently-watched first. Never throws - a disabled/blocked
 * localStorage (private browsing, some content blockers) just means no
 * history, not a broken page. */
export function getRecentlyWatched(): RecentlyWatchedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** How far in before a resume is worth offering. Under this a devotee has
 * barely started and would rather begin again than be dropped 12 seconds in. */
export const RESUME_MIN_SECONDS = 30;
/** How close to the end counts as finished. Past this the position is cleared,
 * so a completed lecture never resumes two seconds from the credits. */
export const RESUME_END_MARGIN_SECONDS = 60;

/** A useful resume point for one entry, or null. Applies both thresholds, so
 * callers get "resume here" or nothing and never have to reason about it.
 * Takes the entry rather than reading storage, so it works equally on a
 * useSyncExternalStore snapshot (the SSR-safe way to read this) and on a row
 * that came back from the account. */
export function resumeFromEntry(entry: RecentlyWatchedEntry | undefined): number | null {
  const at = entry?.position_seconds;
  if (at == null || at < RESUME_MIN_SECONDS) return null;
  const duration = entry?.duration_seconds;
  if (duration != null && at > duration - RESUME_END_MARGIN_SECONDS) return null;
  return Math.floor(at);
}

/** What a card should show for a partly-watched video, or null for none.
 *
 * Shares RESUME_END_MARGIN_SECONDS with resumeFromEntry deliberately: a
 * lecture left in its final minute is FINISHED, and a card reading "1 min
 * left" under a bar pinned at 99% - forever, because nothing will ever move
 * it - is worse than a card showing nothing. That is the bug this replaces:
 * the guard was `position < duration`, which every one of those cases passes.
 *
 * It does NOT share RESUME_MIN_SECONDS, and the asymmetry is the point. The
 * bar is honest about five seconds watched; RESUMING from five seconds in is
 * merely unhelpful. Different questions, different thresholds.
 */
export function cardProgress(
  positionSeconds: number | null | undefined,
  durationSeconds: number | null | undefined
): { percent: number; minutesLeft: number } | null {
  const at = positionSeconds;
  const total = durationSeconds;
  if (at == null || at <= 0) return null;
  if (total == null || total <= 0) return null;
  if (at > total - RESUME_END_MARGIN_SECONDS) return null;
  return {
    percent: Math.min(100, (at / total) * 100),
    // Floored at 1: "0 min left" on something still playing reads as broken.
    minutesLeft: Math.max(1, Math.round((total - at) / 60)),
  };
}

/** Updates just the position of an existing entry, in place. Deliberately
 * does NOT reorder the list or create an entry: position updates fire every
 * few seconds while a video plays, and each one moving the video to the front
 * would make "recently watched" mean "currently watching" and nothing else. */
export function recordPosition(youtubeVideoId: string, seconds: number): void {
  try {
    const all = getRecentlyWatched();
    const index = all.findIndex((e) => e.youtube_video_id === youtubeVideoId);
    if (index === -1) return;
    all[index] = { ...all[index], position_seconds: Math.floor(seconds) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable/full - resume is a nicety, never load-bearing.
  }
}

/** Records a watch, moving it to the front if already present (so
 * re-watching bumps it up rather than creating a duplicate), capped at
 * MAX_ENTRIES so the list can't grow unbounded over months of browsing. */
export function recordWatched(entry: Omit<RecentlyWatchedEntry, "watched_at">): void {
  try {
    const existing = getRecentlyWatched().filter((e) => e.youtube_video_id !== entry.youtube_video_id);
    const next = [{ ...entry, watched_at: Date.now() }, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable/full - watch history is a nicety, not core
    // functionality, so this fails silently rather than surfacing an error.
  }
}

// --- useSyncExternalStore support (ContinueWatchingShelf) ---
// The snapshot is the RAW string, not a freshly-parsed array: React compares
// snapshots with Object.is, so returning a new array/object every call would
// never equal the previous one and defeat the point of the store (or, done
// inside an effect, trip the react-hooks/set-state-in-effect lint rule this
// hook exists to avoid). Parsing happens in the component, memoized on this
// string.

/** Subscribes to OTHER tabs/windows changing this data (the only case the
 * "storage" event fires for - a same-tab recordWatched() is instead picked
 * up by a fresh navigation remounting the component and re-reading the
 * snapshot). Matches useSyncExternalStore's subscribe signature. */
export function subscribeToRecentlyWatched(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function getRecentlyWatchedSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** For useSyncExternalStore's required 3rd argument (SSR has no
 * localStorage) - "" parses to the same empty list as a real visitor with
 * no watch history yet, so no special-casing is needed where it's used. */
export function getRecentlyWatchedServerSnapshot(): string {
  return "";
}

/** A history entry rendered as a Video, so VideoCard/CategoryRow can show it
 * without a second card component to maintain. Lives here (beside the type it
 * converts) because BOTH the home shelf and /library need it.
 *
 * VideoCard only ever reads title, duration_seconds, thumbnail_url,
 * youtube_video_id, channel?.title, published_at and view_count - the other
 * fields are placeholders. published_at/view_count stay null on purpose:
 * showing a fabricated date or view count would be dishonest, so the card
 * simply omits them. */
export function historyEntryToVideo(entry: RecentlyWatchedEntry): Video {
  return {
    id: 0,
    channel_id: 0,
    category: "",
    language: null,
    tags: [],
    featured: false,
    created_at: "",
    description: null,
    published_at: null,
    view_count: null,
    youtube_video_id: entry.youtube_video_id,
    title: entry.title,
    thumbnail_url: entry.thumbnail_url,
    duration_seconds: entry.duration_seconds,
    channel: entry.channel_title
      ? { title: entry.channel_title, handle: null, thumbnail_url: null }
      : null,
  };
}

export function parseRecentlyWatchedSnapshot(raw: string): RecentlyWatchedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
