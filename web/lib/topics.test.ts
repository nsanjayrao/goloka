import { describe, expect, it } from "vitest";

import { getActiveFestivalTopic } from "./topics";

// Formalizes the boundary checks originally done by hand against
// worker/sync.py-style date arithmetic when the festival-rotation feature
// shipped (2026-07-05) - see lib/topics.ts's festivalWindow comments for why
// these are approximate, yearly-recurring Gregorian windows rather than the
// precise lunar tithi.
describe("getActiveFestivalTopic", () => {
  it("is null on an ordinary day with no festival window open", () => {
    expect(getActiveFestivalTopic(new Date(2026, 6, 5))).toBeNull(); // July 5
  });

  it("is null the day before Janmashtami's window starts", () => {
    expect(getActiveFestivalTopic(new Date(2026, 7, 9))).toBeNull(); // Aug 9
  });

  it("activates Janmashtami on the window's first day", () => {
    expect(getActiveFestivalTopic(new Date(2026, 7, 10))?.slug).toBe("janmashtami"); // Aug 10
  });

  it("stays active mid-window", () => {
    expect(getActiveFestivalTopic(new Date(2026, 7, 25))?.slug).toBe("janmashtami"); // Aug 25
  });

  it("activates Janmashtami on the window's last day", () => {
    expect(getActiveFestivalTopic(new Date(2026, 8, 10))?.slug).toBe("janmashtami"); // Sep 10
  });

  it("is null the day after Janmashtami's window ends", () => {
    expect(getActiveFestivalTopic(new Date(2026, 8, 11))).toBeNull(); // Sep 11
  });

  it("activates Nrsimha on its window's first and last day", () => {
    expect(getActiveFestivalTopic(new Date(2026, 3, 20))?.slug).toBe("nrsimha"); // Apr 20
    expect(getActiveFestivalTopic(new Date(2026, 4, 20))?.slug).toBe("nrsimha"); // May 20
  });

  it("is null just outside Nrsimha's window on either side", () => {
    expect(getActiveFestivalTopic(new Date(2026, 3, 19))).toBeNull(); // Apr 19
    expect(getActiveFestivalTopic(new Date(2026, 4, 21))).toBeNull(); // May 21
  });
});
