import { beforeEach, describe, expect, it } from "vitest";

import {
  getRecentlyWatched,
  getRecentlyWatchedServerSnapshot,
  parseRecentlyWatchedSnapshot,
  recordWatched,
} from "./recently-watched";

// The Node test environment has no `localStorage` global (that's a browser
// API) - a tiny in-memory stand-in is enough to exercise the real
// get/set/JSON logic in recently-watched.ts, which is what the "no server,
// no accounts" Continue Watching row depends on entirely.
function installFakeLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

function entry(id: string) {
  return { youtube_video_id: id, title: `Video ${id}`, thumbnail_url: null, channel_title: null, duration_seconds: 60 };
}

describe("recordWatched / getRecentlyWatched", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("orders most-recently-watched first", () => {
    recordWatched(entry("AAA"));
    recordWatched(entry("BBB"));
    expect(getRecentlyWatched().map((e) => e.youtube_video_id)).toEqual(["BBB", "AAA"]);
  });

  it("re-watching moves an entry to the front without duplicating it", () => {
    recordWatched(entry("AAA"));
    recordWatched(entry("BBB"));
    recordWatched(entry("AAA"));
    const list = getRecentlyWatched();
    expect(list.map((e) => e.youtube_video_id)).toEqual(["AAA", "BBB"]);
    expect(list).toHaveLength(2);
  });

  it("caps the list at 12 entries, keeping the newest", () => {
    for (let i = 0; i < 20; i++) recordWatched(entry(`V${i}`));
    const list = getRecentlyWatched();
    expect(list).toHaveLength(12);
    expect(list[0].youtube_video_id).toBe("V19");
  });
});

describe("parseRecentlyWatchedSnapshot", () => {
  it("returns [] for an empty string, invalid JSON, or a non-array value", () => {
    expect(parseRecentlyWatchedSnapshot("")).toEqual([]);
    expect(parseRecentlyWatchedSnapshot("{not json")).toEqual([]);
    expect(parseRecentlyWatchedSnapshot('{"not":"an array"}')).toEqual([]);
  });

  it("round-trips a real recorded entry", () => {
    installFakeLocalStorage();
    recordWatched(entry("AAA"));
    const raw = localStorage.getItem("goloka:recently-watched")!;
    expect(parseRecentlyWatchedSnapshot(raw)).toHaveLength(1);
  });
});

describe("getRecentlyWatchedServerSnapshot", () => {
  it("is an empty string, matching a visitor with no watch history", () => {
    expect(getRecentlyWatchedServerSnapshot()).toBe("");
    expect(parseRecentlyWatchedSnapshot(getRecentlyWatchedServerSnapshot())).toEqual([]);
  });
});
