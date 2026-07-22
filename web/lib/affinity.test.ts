import { describe, expect, it } from "vitest";

import { topCategories, watchedIds } from "./affinity";
import type { RecentlyWatchedEntry } from "./recently-watched";

function entry(id: string, category: string | null | undefined, watchedAt: number): RecentlyWatchedEntry {
  return {
    youtube_video_id: id,
    title: id,
    thumbnail_url: null,
    channel_title: null,
    duration_seconds: null,
    watched_at: watchedAt,
    category,
  };
}

describe("topCategories", () => {
  it("ranks by count, then by recency", () => {
    const entries = [
      entry("a", "Kirtan", 100),
      entry("b", "Kirtan", 300),
      entry("c", "Lectures", 500), // fewer, but most recent
      entry("d", "Festivals", 200),
      entry("e", "Festivals", 400),
    ];
    const top = topCategories(entries, 2);
    expect(top.map((t) => t.category)).toEqual(["Festivals", "Kirtan"]);
    // count ties between Festivals(2) and Kirtan(2) resolve by recency: 400 > 300
    expect(top[0].count).toBe(2);
  });

  it("entries without a category (pre-field history) simply don't vote", () => {
    const entries = [entry("a", null, 100), entry("b", undefined, 200), entry("c", "Kirtan", 50)];
    expect(topCategories(entries).map((t) => t.category)).toEqual(["Kirtan"]);
  });

  it("no history, no affinities - the shelf just doesn't render", () => {
    expect(topCategories([])).toEqual([]);
  });

  it("respects the limit", () => {
    const entries = [entry("a", "A", 1), entry("b", "B", 2), entry("c", "C", 3)];
    expect(topCategories(entries, 1)).toHaveLength(1);
  });
});

describe("watchedIds", () => {
  it("collects the ids for dedupe", () => {
    const ids = watchedIds([entry("x", "A", 1), entry("y", "B", 2)]);
    expect(ids.has("x")).toBe(true);
    expect(ids.has("z")).toBe(false);
  });
});
