import { describe, expect, it } from "vitest";

import { OBSERVANCES, todaysObservances, upcomingObservances } from "./vaishnava-observances";

// Same IST-conversion exercise as vaishnava-calendar.test.ts - times given in
// UTC, picked to land unambiguously on one side of midnight IST (UTC+5:30)
// or the other, so these assertions test the rollover logic itself, not
// just the date table.
describe("todaysObservances", () => {
  it("is empty on an ordinary day", () => {
    // 2026-07-20 noon UTC -> 2026-07-20 evening IST, nothing observed that day.
    const now = new Date("2026-07-20T12:00:00Z");
    expect(todaysObservances(now)).toEqual([]);
  });

  it("recognizes today's single observance from within the IST day", () => {
    // 2026-09-05T10:00:00Z = 2026-09-05 15:30 IST - Srila Prabhupada's
    // appearance day (Vyasa-puja).
    const now = new Date("2026-09-05T10:00:00Z");
    const today = todaysObservances(now);
    expect(today).toHaveLength(1);
    expect(today[0].name).toBe("Śrīla Prabhupāda");
    expect(today[0].kind).toBe("appearance");
  });

  it("crosses into the observance's IST date before UTC midnight", () => {
    // 2026-09-04T19:00:00Z = 2026-09-05 00:30 IST - already the 5th in IST,
    // even though it's still the 4th in UTC.
    const now = new Date("2026-09-04T19:00:00Z");
    expect(todaysObservances(now).map((entry) => entry.name)).toEqual(["Śrīla Prabhupāda"]);
  });

  it("returns every entry when two personalities share a tithi", () => {
    // Raghunatha dasa and Raghunatha Bhatta Gosvamis share Oct 23, 2026.
    const now = new Date("2026-10-23T10:00:00Z");
    const today = todaysObservances(now);
    expect(today.map((entry) => entry.name).sort()).toEqual([
      "Śrīla Raghunātha Bhaṭṭa Gosvāmī",
      "Śrīla Raghunātha dāsa Gosvāmī",
    ]);
  });
});

describe("upcomingObservances", () => {
  it("returns the next N entries in chronological order", () => {
    const now = new Date("2026-07-20T12:00:00Z");
    const upcoming = upcomingObservances(now, 3);
    expect(upcoming.map((entry) => entry.date)).toEqual(["2026-07-29", "2026-08-03", "2026-08-24"]);
  });

  it("includes today's entry itself, not just what's strictly ahead", () => {
    const now = new Date("2026-09-05T10:00:00Z");
    const upcoming = upcomingObservances(now, 1);
    expect(upcoming[0].name).toBe("Śrīla Prabhupāda");
    expect(upcoming[0].date).toBe("2026-09-05");
  });

  it("respects the limit", () => {
    const now = new Date("2026-07-20T12:00:00Z");
    expect(upcomingObservances(now, 2)).toHaveLength(2);
  });

  it("is empty past the end of the registry", () => {
    expect(upcomingObservances(new Date("2028-06-01T00:00:00Z"))).toEqual([]);
  });
});

describe("OBSERVANCES registry integrity", () => {
  it("is in non-decreasing chronological order (relied on by upcomingObservances)", () => {
    for (let i = 1; i < OBSERVANCES.length; i++) {
      expect(OBSERVANCES[i].date >= OBSERVANCES[i - 1].date).toBe(true);
    }
  });

  it("every entry has either a topicSlug or a searchQuery to link to", () => {
    for (const entry of OBSERVANCES) {
      expect(Boolean(entry.topicSlug || entry.searchQuery)).toBe(true);
    }
  });
});
