// "Continue Watching" (Tier 3): a personalized homepage row with zero
// backend and zero accounts - watch history lives ONLY in the visitor's own
// browser (localStorage), never sent to or read by the server. This is what
// keeps it consistent with the site's no-user-data stance (see About) while
// still giving a real returning-visitor convenience.
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

export function parseRecentlyWatchedSnapshot(raw: string): RecentlyWatchedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
