import { describe, expect, it } from "vitest";

import { cleanTitle, formatDuration, formatRelativeDate, formatViews } from "./format";

describe("formatDuration", () => {
  it("formats under an hour as M:SS", () => {
    expect(formatDuration(245)).toBe("4:05");
  });
  it("formats an hour or more as H:MM:SS", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });
  it("returns empty string for null/NaN/negative", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(NaN)).toBe("");
    expect(formatDuration(-5)).toBe("");
  });
});

describe("formatViews", () => {
  it("compacts large counts and appends 'views'", () => {
    expect(formatViews(1200)).toBe("1.2K views");
    expect(formatViews(2500000)).toBe("2.5M views");
  });
  it("returns empty string for null/NaN/negative", () => {
    expect(formatViews(null)).toBe("");
    expect(formatViews(NaN)).toBe("");
    expect(formatViews(-1)).toBe("");
  });
});

describe("cleanTitle", () => {
  it("strips #hashtags and collapses whitespace", () => {
    expect(cleanTitle("Kirtan Tonight #shorts #hare_krishna")).toBe("Kirtan Tonight");
  });
  it("trims dangling separator junk left after hashtag removal", () => {
    expect(cleanTitle("Kirtan ॥ #shorts")).toBe("Kirtan ॥");
  });
  it("de-shouts a mostly-uppercase title but keeps honorifics/scripture abbreviations", () => {
    expect(cleanTitle("WHY SMILING CAN CHANGE YOUR LIFE BY HH GAUR GOPAL DAS")).toBe(
      "Why Smiling Can Change Your Life By HH Gaur Gopal Das"
    );
  });
  it("leaves a short all-caps title alone (below the 12-letter floor)", () => {
    expect(cleanTitle("BG 2.13")).toBe("BG 2.13");
  });
  it("falls back to the raw title if cleaning would remove everything", () => {
    expect(cleanTitle("#shorts #reels")).toBe("#shorts #reels");
  });
});

describe("formatRelativeDate", () => {
  it("returns empty string for a null or unparseable date", () => {
    expect(formatRelativeDate(null)).toBe("");
    expect(formatRelativeDate("not a date")).toBe("");
  });
  it("returns 'just now' for anything under a minute old", () => {
    const now = new Date().toISOString();
    expect(formatRelativeDate(now)).toBe("just now");
  });
  it("picks the largest whole unit for an older date", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeDate(twoDaysAgo)).toBe("2 days ago");
  });
});
