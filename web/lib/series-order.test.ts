import { describe, expect, it } from "vitest";

import {
  displayPartNumber,
  isReverseChronological,
  seriesReadingOrder,
  watchPageSeriesReversed,
} from "./series-order";
import type { SeriesEpisode, Video } from "./types";

/** Minimal episode - only `position` and `published_at` are read. */
function ep(position: number, published_at: string | null): SeriesEpisode {
  return { position, video: { published_at } as unknown as Video };
}

const DESC = ["2026-06-05", "2026-06-04", "2026-06-03", "2026-06-02", "2026-06-01"];
const ASC = [...DESC].slice().reverse();

describe("isReverseChronological", () => {
  it("detects a newest-first playlist", () => {
    expect(isReverseChronological(DESC)).toBe(true);
  });

  it("leaves an oldest-first playlist alone", () => {
    expect(isReverseChronological(ASC)).toBe(false);
  });

  it("refuses to decide on too few datable steps", () => {
    // Three dates = two steps, under the four-step floor. A short playlist
    // must not be flipped on a coin toss.
    expect(isReverseChronological(["2026-06-03", "2026-06-02", "2026-06-01"])).toBe(false);
  });

  it("tolerates a few re-uploads inside a newest-first playlist", () => {
    // Real playlists have back-fills; a strict all-descending test would
    // never fire. Seven descending steps against one ascending still counts.
    const withReupload = [
      "2026-06-08", "2026-06-07", "2026-06-06", "2026-06-05",
      "2026-06-09", // a re-upload slotted mid-list
      "2026-06-04", "2026-06-03", "2026-06-02",
    ];
    expect(isReverseChronological(withReupload)).toBe(true);
  });

  it("does NOT flip a deliberately curated order", () => {
    // Alternating dates carry no direction. Flipping a hand-arranged
    // playlist is worse than leaving a reverse-chronological one alone.
    const curated = [
      "2026-06-01", "2026-06-09", "2026-06-02", "2026-06-08",
      "2026-06-03", "2026-06-07",
    ];
    expect(isReverseChronological(curated)).toBe(false);
  });

  it("survives missing dates without counting them", () => {
    expect(isReverseChronological([null, "2026-06-05", undefined, "2026-06-01"])).toBe(false);
  });

  it("handles empty and single-item input", () => {
    expect(isReverseChronological([])).toBe(false);
    expect(isReverseChronological(["2026-06-01"])).toBe(false);
  });
});

describe("seriesReadingOrder", () => {
  it("turns a newest-first playlist around and numbers from the oldest", () => {
    const episodes = DESC.map((d, i) => ep(i, d));
    const { episodes: ordered, reversed } = seriesReadingOrder(episodes);
    expect(reversed).toBe(true);
    // Part one is the OLDEST class, which sat at the last playlist position.
    expect(ordered[0].partNumber).toBe(1);
    expect(ordered[0].episode.video.published_at).toBe("2026-06-01");
    expect(ordered[ordered.length - 1].partNumber).toBe(5);
    expect(ordered[ordered.length - 1].episode.video.published_at).toBe("2026-06-05");
  });

  it("leaves an oldest-first playlist exactly as it is", () => {
    const episodes = ASC.map((d, i) => ep(i, d));
    const { episodes: ordered, reversed } = seriesReadingOrder(episodes);
    expect(reversed).toBe(false);
    expect(ordered.map((o) => o.episode.position)).toEqual([0, 1, 2, 3, 4]);
    expect(ordered.map((o) => o.partNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("preserves the true playlist position, which prev/next depends on", () => {
    const episodes = DESC.map((d, i) => ep(i, d));
    const { episodes: ordered } = seriesReadingOrder(episodes);
    // Reversed for display, but position still says where it really sits.
    expect(ordered[0].episode.position).toBe(4);
    expect(ordered[4].episode.position).toBe(0);
  });

  it("numbers every part exactly once", () => {
    const episodes = DESC.map((d, i) => ep(i, d));
    const parts = seriesReadingOrder(episodes).episodes.map((o) => o.partNumber);
    expect(parts).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles an empty series", () => {
    expect(seriesReadingOrder([]).episodes).toEqual([]);
  });
});

describe("displayPartNumber", () => {
  it("counts back from the end on a reversed series", () => {
    // The 87-part Bhagavatam: playlist slot 11 is part 76 today, and the
    // devotee twelve classes in should be told 76 -> no; they are part 76
    // counted from the oldest, which is what this returns.
    expect(displayPartNumber(11, 87, true)).toBe(76);
    expect(displayPartNumber(0, 87, true)).toBe(87);
    expect(displayPartNumber(86, 87, true)).toBe(1);
  });

  it("is a plain 1-based index on a normal series", () => {
    expect(displayPartNumber(0, 87, false)).toBe(1);
    expect(displayPartNumber(11, 87, false)).toBe(12);
  });

  it("clamps when item_count disagrees with the indexed rows", () => {
    // YouTube's item_count includes deleted/private videos we never indexed,
    // so a position can fall outside it. Never show 0 or a negative part.
    expect(displayPartNumber(99, 87, true)).toBe(1);
    expect(displayPartNumber(0, 0, true)).toBe(1);
  });
});

describe("watchPageSeriesReversed", () => {
  it("detects a reversed series from the two neighbours already fetched", () => {
    expect(watchPageSeriesReversed("2026-06-03", "2026-06-02", "2026-06-01")).toBe(true);
  });

  it("says no on a normal series", () => {
    expect(watchPageSeriesReversed("2026-06-01", "2026-06-02", "2026-06-03")).toBe(false);
  });

  it("declines to guess with only one neighbour", () => {
    // One step is not evidence. Leave the existing numbering alone rather
    // than flip a whole series' labelling on a single comparison.
    expect(watchPageSeriesReversed(null, "2026-06-02", "2026-06-01")).toBe(false);
    expect(watchPageSeriesReversed("2026-06-03", "2026-06-02", null)).toBe(false);
  });

  it("declines when the two steps disagree", () => {
    expect(watchPageSeriesReversed("2026-06-01", "2026-06-03", "2026-06-02")).toBe(false);
  });
});
