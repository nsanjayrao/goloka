import type { SeriesEpisode } from "@/lib/types";

// WHICH WAY A SERIES RUNS.
//
// A YouTube playlist's `position` is the order the channel arranged it in,
// and for a lecture series that is very often NEWEST FIRST - the way an
// uploads feed reads. Goloka numbered those positions 1…N as if they were a
// syllabus, so on H.D. Goswami's 87-part Śrīmad Bhāgavatam, "part 1" was the
// most recent class and the verse numbers descended as the part numbers
// climbed:
//
//     1  Srimad Bhagavatam 11.4.15
//     …
//     13 Srimad Bhagavatam 7.3.32
//     14 Srimad Bhagavatam 7.3.31
//
// A devotee who wanted to begin at the beginning had to scroll to the bottom
// of up to 500 rows - which inverts the series page's own stated purpose
// ("so a devotee who met episode 10 first can simply start at episode 1").
// The watch page repeated it, telling someone twelve classes in that they
// were on "Part 76 of 87".
//
// NOTHING IS RE-SORTED BY DATE. The playlist's own order is preserved
// exactly; all that changes is which END is called part one. A curated
// playlist that is deliberately not chronological keeps its arrangement,
// because the detection below refuses to fire without a clear signal.

/** Positions whose dates are known, paired with the position after them. */
function trend(dates: (string | null | undefined)[]): { descending: number; ascending: number } {
  let descending = 0;
  let ascending = 0;
  for (let i = 1; i < dates.length; i += 1) {
    const previous = dates[i - 1];
    const current = dates[i];
    if (!previous || !current) continue;
    if (current < previous) descending += 1;
    else if (current > previous) ascending += 1;
  }
  return { descending, ascending };
}

/**
 * True when a playlist runs newest-first, i.e. `published_at` falls as
 * `position` rises.
 *
 * DELIBERATELY HARD TO TRIGGER. It needs at least four datable steps and a
 * two-to-one majority, because the cost of being wrong is asymmetric: a
 * genuinely curated playlist ("watch these five in this order") that gets
 * flipped is actively misleading, while a reverse-chronological one left
 * alone is merely the status quo. Re-uploads and back-fills put a few
 * ascending steps into almost every real playlist, so a strict "all
 * descending" test would fire almost never.
 */
export function isReverseChronological(dates: (string | null | undefined)[]): boolean {
  const { descending, ascending } = trend(dates);
  const datable = descending + ascending;
  return datable >= 4 && descending > ascending * 2;
}

/**
 * A series' episodes in READING order - part one first - plus whether the
 * playlist had to be turned around to get there.
 *
 * The array is reversed, never re-sorted: `position` still holds the true
 * playlist slot (the watch page and the prev/next walk depend on it), and
 * `partNumber` is what a devotee should be shown.
 */
export function seriesReadingOrder(episodes: SeriesEpisode[]): {
  episodes: { episode: SeriesEpisode; partNumber: number }[];
  reversed: boolean;
} {
  const reversed = isReverseChronological(episodes.map((e) => e.video?.published_at));
  const ordered = reversed ? [...episodes].reverse() : episodes;
  return {
    episodes: ordered.map((episode, index) => ({ episode, partNumber: index + 1 })),
    reversed,
  };
}

/**
 * The part number to show for one video, given its true playlist position.
 *
 * `total` is how many episodes the series has. On a reversed playlist the
 * last slot is part one, so the numbering counts back from the end. Clamped
 * to 1…total because `item_count` comes from YouTube and can disagree with
 * the rows we actually indexed - a "Part 0 of 87" is worse than a slightly
 * stale number.
 */
export function displayPartNumber(position: number, total: number, reversed: boolean): number {
  if (total <= 0) return position + 1;
  const part = reversed ? total - position : position + 1;
  return Math.min(Math.max(part, 1), total);
}

/**
 * Whether the series a watch page is showing runs newest-first, decided from
 * the three videos that page ALREADY has - the previous episode, this one,
 * and the next - so it costs no extra query.
 *
 * Two neighbours give only two steps, which is below `isReverseChronological`'s
 * four-step floor, so this uses a simpler rule for the smaller sample: both
 * available steps must descend. With only one neighbour it declines to guess
 * and returns false, leaving the existing numbering alone.
 */
export function watchPageSeriesReversed(
  previousDate: string | null | undefined,
  currentDate: string | null | undefined,
  nextDate: string | null | undefined
): boolean {
  const dates = [previousDate, currentDate, nextDate];
  const { descending, ascending } = trend(dates);
  return descending >= 2 && ascending === 0;
}
