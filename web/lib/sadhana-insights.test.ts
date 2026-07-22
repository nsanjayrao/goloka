import { describe, expect, it } from "vitest";

import {
  computeUnbrokenDays,
  mantraTotalsForMonth,
  milestoneReached,
  monthSlice,
  previousDayKey,
  shiftMonth,
  sumByDay,
  type JapaRow,
} from "./sadhana-insights";

const row = (day: string, mantra: string, rounds: number): JapaRow => ({ day, mantra, rounds });

describe("sumByDay", () => {
  it("sums mantras within a day and sorts ascending", () => {
    const rows = [
      row("2026-07-20", "mahamantra", 4),
      row("2026-07-19", "mahamantra", 2),
      row("2026-07-20", "sri-radha", 3),
    ];
    expect(sumByDay(rows)).toEqual([
      { day: "2026-07-19", rounds: 2 },
      { day: "2026-07-20", rounds: 7 },
    ]);
  });

  it("empty in, empty out", () => {
    expect(sumByDay([])).toEqual([]);
  });
});

describe("previousDayKey", () => {
  it("steps back within a month, across months, and across years", () => {
    expect(previousDayKey("2026-07-22")).toBe("2026-07-21");
    expect(previousDayKey("2026-07-01")).toBe("2026-06-30");
    expect(previousDayKey("2026-01-01")).toBe("2025-12-31");
    expect(previousDayKey("2024-03-01")).toBe("2024-02-29"); // leap
  });
});

describe("computeUnbrokenDays", () => {
  const daily = (days: string[]) => days.map((d) => ({ day: d, rounds: 1 }));

  it("counts a run ending today", () => {
    const d = daily(["2026-07-20", "2026-07-21", "2026-07-22"]);
    expect(computeUnbrokenDays(d, "2026-07-22")).toBe(3);
  });

  it("a run is still alive at breakfast - today not yet chanted counts through yesterday", () => {
    const d = daily(["2026-07-20", "2026-07-21"]);
    expect(computeUnbrokenDays(d, "2026-07-22")).toBe(2);
  });

  it("a gap ends the run quietly - zero, not drama", () => {
    const d = daily(["2026-07-18", "2026-07-19"]); // nothing on the 20th/21st
    expect(computeUnbrokenDays(d, "2026-07-22")).toBe(0);
  });

  it("a gap in the middle only counts the recent side", () => {
    const d = daily(["2026-07-15", "2026-07-16", "2026-07-21", "2026-07-22"]);
    expect(computeUnbrokenDays(d, "2026-07-22")).toBe(2);
  });

  it("days with zero rounds do not extend a run", () => {
    const d = [
      { day: "2026-07-21", rounds: 0 },
      { day: "2026-07-22", rounds: 2 },
    ];
    expect(computeUnbrokenDays(d, "2026-07-22")).toBe(1);
  });

  it("no chanting at all is zero", () => {
    expect(computeUnbrokenDays([], "2026-07-22")).toBe(0);
  });
});

describe("monthSlice", () => {
  it("keeps only the asked month", () => {
    const d = [
      { day: "2026-06-30", rounds: 1 },
      { day: "2026-07-01", rounds: 2 },
      { day: "2026-07-31", rounds: 3 },
      { day: "2026-08-01", rounds: 4 },
    ];
    expect(monthSlice(d, "2026-07")).toEqual([
      { day: "2026-07-01", rounds: 2 },
      { day: "2026-07-31", rounds: 3 },
    ]);
  });
});

describe("mantraTotalsForMonth", () => {
  it("totals per mantra within the month, largest first", () => {
    const rows = [
      row("2026-07-01", "mahamantra", 8),
      row("2026-07-02", "sri-radha", 12),
      row("2026-07-02", "mahamantra", 2),
      row("2026-06-30", "mahamantra", 99), // other month - excluded
    ];
    expect(mantraTotalsForMonth(rows, "2026-07")).toEqual([
      { mantra: "sri-radha", rounds: 12 },
      { mantra: "mahamantra", rounds: 10 },
    ]);
  });
});

describe("milestoneReached", () => {
  it("returns the largest threshold passed, or null", () => {
    expect(milestoneReached(0)).toBeNull();
    expect(milestoneReached(107)).toBeNull();
    expect(milestoneReached(108)).toBe(108);
    expect(milestoneReached(1007)).toBe(108);
    expect(milestoneReached(1008)).toBe(1008);
    expect(milestoneReached(20000)).toBe(10008);
  });
});

describe("shiftMonth", () => {
  it("moves across month and year edges", () => {
    expect(shiftMonth("2026-07", -1)).toBe("2026-06");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftMonth("2026-07", 0)).toBe("2026-07");
  });
});
