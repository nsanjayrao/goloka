import { describe, expect, it } from "vitest";

import { daysUntil, nextEkadashi, todaysEkadashi } from "./vaishnava-calendar";

// Times are given in UTC and picked to land unambiguously on one side of
// midnight IST (UTC+5:30) or the other, so these assertions exercise the
// IST-conversion logic itself, not just the date table.
describe("todaysEkadashi / nextEkadashi", () => {
  it("is null on an ordinary day", () => {
    // 2026-07-20 noon UTC -> 2026-07-20 evening IST, no ekadashi that day.
    const now = new Date("2026-07-20T12:00:00Z");
    expect(todaysEkadashi(now)).toBeNull();
    expect(nextEkadashi(now)?.date).toBe("2026-07-25");
  });

  it("recognizes today as Sayani Ekadashi from within the IST day", () => {
    // 2026-07-25T10:00:00Z = 2026-07-25 15:30 IST - still the 25th in IST.
    const now = new Date("2026-07-25T10:00:00Z");
    expect(todaysEkadashi(now)?.name).toBe("Śayanī Ekādaśī");
    expect(nextEkadashi(now)?.name).toBe("Śayanī Ekādaśī");
  });

  it("crosses into the ekadashi's IST date before UTC midnight", () => {
    // 2026-07-24T19:00:00Z = 2026-07-25 00:30 IST - already the 25th in IST,
    // even though it's still the 24th in UTC. This is the case the naive
    // "compare UTC dates" approach would get wrong.
    const now = new Date("2026-07-24T19:00:00Z");
    expect(todaysEkadashi(now)?.date).toBe("2026-07-25");
  });

  it("has moved on the day after", () => {
    // 2026-07-26 noon UTC -> 2026-07-26 evening IST.
    const now = new Date("2026-07-26T12:00:00Z");
    expect(todaysEkadashi(now)).toBeNull();
    expect(nextEkadashi(now)?.date).toBe("2026-08-09");
  });

  it("returns null past the end of the registry", () => {
    expect(nextEkadashi(new Date("2028-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("daysUntil", () => {
  it("is 0 for today", () => {
    expect(daysUntil("2026-07-25", new Date("2026-07-25T10:00:00Z"))).toBe(0);
  });

  it("counts whole days ahead", () => {
    expect(daysUntil("2026-08-09", new Date("2026-07-25T10:00:00Z"))).toBe(15);
  });

  it("is negative for a date already past", () => {
    expect(daysUntil("2026-07-25", new Date("2026-08-09T10:00:00Z"))).toBe(-15);
  });
});
