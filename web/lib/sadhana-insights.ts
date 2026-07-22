// Pure helpers for the sādhana dashboard (components/sadhana-client.tsx):
// everything computable from the devotee's own fetched rows, kept out of the
// component so it is unit-tested the way lib/japa-rhythm.ts is. No React,
// no Supabase, no Date.now() - callers pass "today" in, so tests (and the
// dashboard) are deterministic.
//
// The devotional register matters here as much as the arithmetic: an
// unbroken run of days is counted while it lives and simply not mentioned
// when it doesn't - there is no "broken streak", no loss language, nothing
// to protect. Milestones are quiet thresholds passed, never badges.

/** One raw row of the devotee's record: a day, a mantra, a count. */
export type JapaRow = { day: string; mantra: string; rounds: number };

export type DayTotal = { day: string; rounds: number };

/** Rows → per-day totals (mantras summed), ascending by day. */
export function sumByDay(rows: JapaRow[]): DayTotal[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.rounds);
  }
  return [...byDay.entries()]
    .map(([day, rounds]) => ({ day, rounds }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** The "YYYY-MM-DD" key of the day before `day` - date arithmetic through
 * a real Date at NOON so a DST shift can never slide it two days. */
export function previousDayKey(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() - 1);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * The devotee's current unbroken run of chanting days, ending today - or
 * ending YESTERDAY when today's chanting simply hasn't happened yet (a run
 * must not read as gone at breakfast). 0 when neither today nor yesterday
 * has rounds. The caller shows it only when ≥ 2 - one day is a beginning,
 * not yet a run - and shows nothing at all otherwise.
 */
export function computeUnbrokenDays(daily: DayTotal[], today: string): number {
  const chanted = new Set(daily.filter((d) => d.rounds > 0).map((d) => d.day));
  let cursor = chanted.has(today) ? today : previousDayKey(today);
  if (!chanted.has(cursor)) return 0;
  let run = 0;
  while (chanted.has(cursor)) {
    run += 1;
    cursor = previousDayKey(cursor);
  }
  return run;
}

/** Per-day totals within one "YYYY-MM" month, ascending. */
export function monthSlice(daily: DayTotal[], monthKey: string): DayTotal[] {
  return daily.filter((d) => d.day.startsWith(monthKey + "-"));
}

/** Rows → per-mantra totals within one "YYYY-MM" month, largest first.
 * Lets the dashboard say "of which Śrī Rādhā: n" instead of summing every
 * mantra into one anonymous number. */
export function mantraTotalsForMonth(
  rows: JapaRow[],
  monthKey: string
): { mantra: string; rounds: number }[] {
  const byMantra = new Map<string, number>();
  for (const row of rows) {
    if (!row.day.startsWith(monthKey + "-")) continue;
    byMantra.set(row.mantra, (byMantra.get(row.mantra) ?? 0) + row.rounds);
  }
  return [...byMantra.entries()]
    .map(([mantra, rounds]) => ({ mantra, rounds }))
    .sort((a, b) => b.rounds - a.rounds);
}

/** The quiet thresholds: sacred counts, not gamified levels. 108 rounds is
 * a mālā of mālās; 1,008 and 10,008 are the traditional grand counts. */
const MILESTONES = [10008, 1008, 108];

/** The largest milestone this total has passed, or null - the dashboard
 * mentions it in one muted line and nothing more. */
export function milestoneReached(total: number): number | null {
  for (const m of MILESTONES) {
    if (total >= m) return m;
  }
  return null;
}

/** The "YYYY-MM" month `n` months before the given one (n ≥ 0). */
export function shiftMonth(monthKey: string, by: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const date = new Date(y, m - 1 + by, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
