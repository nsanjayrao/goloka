import { beforeEach, describe, expect, it } from "vitest";

import {
  getRecentlyWatched,
  getRecentlyWatchedServerSnapshot,
  parseRecentlyWatchedSnapshot,
  recordPosition,
  recordWatched,
  RESUME_END_MARGIN_SECONDS,
  RESUME_MIN_SECONDS,
  resumeFromEntry,
  type RecentlyWatchedEntry,
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

// --- resume position (2026-08-01) ---
// The two thresholds are invented numbers with real consequences - one decides
// whether a devotee is dropped mid-sentence into something they had barely
// started, the other whether a finished lecture reopens at the credits. Pinned
// here so changing either is a deliberate act rather than a silent drift.

function watched(overrides: Partial<RecentlyWatchedEntry> = {}): RecentlyWatchedEntry {
  return {
    youtube_video_id: "a",
    title: "A lecture",
    thumbnail_url: null,
    channel_title: null,
    duration_seconds: 3600,
    watched_at: 1,
    ...overrides,
  };
}

describe("resumeFromEntry", () => {
  it("is null when there is no entry, or no position on it", () => {
    expect(resumeFromEntry(undefined)).toBeNull();
    expect(resumeFromEntry(watched())).toBeNull();
    expect(resumeFromEntry(watched({ position_seconds: null }))).toBeNull();
  });

  it("does not resume a lecture barely started", () => {
    expect(resumeFromEntry(watched({ position_seconds: RESUME_MIN_SECONDS - 1 }))).toBeNull();
    expect(resumeFromEntry(watched({ position_seconds: 0 }))).toBeNull();
  });

  it("resumes from the threshold onwards", () => {
    expect(resumeFromEntry(watched({ position_seconds: RESUME_MIN_SECONDS }))).toBe(
      RESUME_MIN_SECONDS
    );
    expect(resumeFromEntry(watched({ position_seconds: 1320 }))).toBe(1320);
  });

  it("treats a lecture watched to the end as finished, not resumable", () => {
    const duration = 3600;
    // One second past the margin - finished.
    expect(
      resumeFromEntry(
        watched({ duration_seconds: duration, position_seconds: duration - RESUME_END_MARGIN_SECONDS + 1 })
      )
    ).toBeNull();
    // Exactly at the margin - still worth resuming.
    expect(
      resumeFromEntry(
        watched({ duration_seconds: duration, position_seconds: duration - RESUME_END_MARGIN_SECONDS })
      )
    ).toBe(duration - RESUME_END_MARGIN_SECONDS);
  });

  it("still resumes when the duration is unknown - it just cannot judge the end", () => {
    expect(resumeFromEntry(watched({ duration_seconds: null, position_seconds: 999 }))).toBe(999);
  });

  it("floors fractional seconds, because the YouTube start param is an integer", () => {
    expect(resumeFromEntry(watched({ position_seconds: 91.7 }))).toBe(91);
  });
});

describe("recordPosition", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("stores the position on the matching entry", () => {
    recordWatched(entry("a"));
    recordPosition("a", 42.9);
    expect(getRecentlyWatched()[0].position_seconds).toBe(42);
  });

  it("does NOT reorder history - a video playing for an hour must not keep bumping itself", () => {
    recordWatched(entry("a"));
    recordWatched(entry("b"));
    recordWatched(entry("c"));
    expect(getRecentlyWatched().map((e) => e.youtube_video_id)).toEqual(["c", "b", "a"]);
    recordPosition("a", 500);
    expect(getRecentlyWatched().map((e) => e.youtube_video_id)).toEqual(["c", "b", "a"]);
  });

  it("is a no-op for a video that was never watched, rather than inventing an entry", () => {
    recordWatched(entry("a"));
    recordPosition("never-seen", 500);
    const all = getRecentlyWatched();
    expect(all).toHaveLength(1);
    expect(all[0].youtube_video_id).toBe("a");
  });
});
