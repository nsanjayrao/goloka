// The whole "recommendation engine", honestly sized: which categories has
// this visitor actually been watching? Computed from the on-device watch
// history (lib/recently-watched.ts) - nothing is ever sent anywhere, there
// is no profile, and clearing the browser clears the taste. Pure functions,
// unit-tested like lib/japa-rhythm.ts.

import type { RecentlyWatchedEntry } from "@/lib/recently-watched";

export type CategoryAffinity = {
  category: string;
  /** How many recent watches fell in this category. */
  count: number;
  /** The most recent watch in it - the recency tiebreak. */
  lastWatchedAt: number;
};

/**
 * The visitor's top categories, strongest first: ranked by how OFTEN they
 * watch a category, ties broken by how RECENTLY. Entries recorded before
 * the category field existed (or with none) simply don't vote. At most
 * `limit` results - the home page shows one or two quiet rows, never a
 * feed.
 */
export function topCategories(entries: RecentlyWatchedEntry[], limit = 2): CategoryAffinity[] {
  const byCategory = new Map<string, CategoryAffinity>();
  for (const entry of entries) {
    const category = entry.category;
    if (!category) continue;
    const existing = byCategory.get(category);
    if (existing) {
      existing.count += 1;
      existing.lastWatchedAt = Math.max(existing.lastWatchedAt, entry.watched_at);
    } else {
      byCategory.set(category, { category, count: 1, lastWatchedAt: entry.watched_at });
    }
  }
  return [...byCategory.values()]
    .sort((a, b) => b.count - a.count || b.lastWatchedAt - a.lastWatchedAt)
    .slice(0, Math.max(0, limit));
}

/** The already-watched ids, for filtering a recommendation row so it never
 * re-offers what the visitor just saw. */
export function watchedIds(entries: RecentlyWatchedEntry[]): Set<string> {
  return new Set(entries.map((e) => e.youtube_video_id));
}
