import { beforeEach, describe, expect, it } from "vitest";

import { getRoundsServerSnapshot, incrementRound, parseRoundsSnapshot, resetToday, todayKey } from "./rounds";

// The Node test environment has no `localStorage` global - a tiny
// in-memory stand-in is enough to exercise the real get/set/JSON logic,
// same approach as recently-watched.test.ts.
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

describe("todayKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(todayKey(new Date(2026, 6, 20))).toBe("2026-07-20"); // month is 0-indexed
    expect(todayKey(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("incrementRound / resetToday", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("starts at 1 for a fresh visitor and increments from there", () => {
    incrementRound();
    expect(parseRoundsSnapshot(localStorage.getItem("goloka:rounds")!)).toBe(1);
    incrementRound();
    incrementRound();
    expect(parseRoundsSnapshot(localStorage.getItem("goloka:rounds")!)).toBe(3);
  });

  it("resetToday clears the count back to zero without erasing the day", () => {
    incrementRound();
    incrementRound();
    resetToday();
    expect(parseRoundsSnapshot(localStorage.getItem("goloka:rounds")!)).toBe(0);
  });

  it("a count stored under yesterday's date silently reads as 0 today (the whole reset mechanism)", () => {
    localStorage.setItem("goloka:rounds", JSON.stringify({ date: "2000-01-01", count: 7 }));
    expect(parseRoundsSnapshot(localStorage.getItem("goloka:rounds")!)).toBe(0);
  });

  it("incrementing after a stale stored date starts fresh at 1, not 8", () => {
    localStorage.setItem("goloka:rounds", JSON.stringify({ date: "2000-01-01", count: 7 }));
    incrementRound();
    expect(parseRoundsSnapshot(localStorage.getItem("goloka:rounds")!)).toBe(1);
  });
});

describe("parseRoundsSnapshot", () => {
  it("returns 0 for an empty string, invalid JSON, or a malformed value", () => {
    expect(parseRoundsSnapshot("")).toBe(0);
    expect(parseRoundsSnapshot("{not json")).toBe(0);
    expect(parseRoundsSnapshot('{"count":"three"}')).toBe(0);
    expect(parseRoundsSnapshot('{"date":"2026-07-20"}')).toBe(0);
  });

  it("never returns a negative count", () => {
    expect(parseRoundsSnapshot(JSON.stringify({ date: todayKey(), count: -3 }))).toBe(0);
  });
});

describe("getRoundsServerSnapshot", () => {
  it("is an empty string, matching a visitor with no rounds chanted yet today", () => {
    expect(getRoundsServerSnapshot()).toBe("");
    expect(parseRoundsSnapshot(getRoundsServerSnapshot())).toBe(0);
  });
});
