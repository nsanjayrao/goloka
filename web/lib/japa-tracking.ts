"use client";

// Cloud japa record (sādhana dashboard, 2026-07-21) - the signed-in
// counterpart to lib/rounds.ts's on-device "rounds today". Signed OUT,
// rounds stay exactly as rounds.ts always kept them: localStorage-only,
// private, gone at the next local day. Signed IN, a completed round is
// ALSO recorded here, at the devotee's own choice - the whole point of
// signing in for chanting (db/schema.sql's japa_rounds table + RLS is the
// only place this ever lives, and it is deleted with the account).
//
// Every function follows lib/data.ts's `safely()` idiom: Supabase
// unconfigured or a query failing degrades to an empty/zero result, never a
// throw, so the dashboard always has a quiet empty state to fall back on
// instead of crashing. Queries stay bounded (free-tier discipline) - see
// each function's comment for why its particular bound is safe.
import { todayKey } from "@/lib/rounds";
import { supabase } from "@/lib/supabase";

/** The sentinel mantra id for default (mahā-mantra) japa - mirrors the
 * 'maha_mantra' default in db/schema.sql's japa_rounds table. The chant
 * redesign (a parallel change) will pass a specific mantra id once it adds
 * mantra choice; until then every round recorded here is this one. */
export const DEFAULT_MANTRA = "maha_mantra";

async function safely<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!supabase) return fallback;
  try {
    return await run();
  } catch (error) {
    console.error("Japa tracking query failed:", error);
    return fallback;
  }
}

/**
 * Records one completed round to the devotee's own cloud record, for the
 * LOCAL calendar day (todayKey(), same clock as lib/rounds.ts). Calls the
 * `increment_japa_round` Postgres function (db/schema.sql) - an atomic
 * upsert-increment, so two rounds finished in quick succession can never
 * race each other and lose a count the way a plain client-side
 * read-then-write upsert could.
 *
 * `userId` is never sent to Postgres - RLS ties every row to `auth.uid()`
 * from the session's own JWT - it exists in this signature only so a
 * caller (the chant page's onRoundComplete) can't call this without
 * already holding a signed-in session.
 */
export async function recordRound(userId: string, mantra: string = DEFAULT_MANTRA): Promise<void> {
  if (!userId || !supabase) return;
  await safely(async () => {
    const { error } = await supabase!.rpc("increment_japa_round", {
      p_day: todayKey(),
      p_mantra: mantra || DEFAULT_MANTRA,
    });
    if (error) throw error;
  }, undefined);
}

export type DailyRounds = { day: string; rounds: number };

/**
 * The raw (day, mantra, rounds) rows from `sinceDate` (inclusive) through
 * today, ascending - ONE bounded query that powers everything recent on the
 * dashboard at once: the month grid, the unbroken-days count, and the
 * per-mantra split (lib/sadhana-insights.ts does the pure math). The bound:
 * a ~400-day window × at most a handful of mantras per day sits comfortably
 * under the 1600-row limit.
 */
export async function getRecentJapaRows(
  userId: string,
  sinceDate: string
): Promise<{ day: string; mantra: string; rounds: number }[]> {
  if (!userId) return [];
  return safely(async () => {
    const { data, error } = await supabase!
      .from("japa_rounds")
      .select("day, mantra, rounds")
      .eq("user_id", userId)
      .gte("day", sinceDate)
      .order("day", { ascending: true })
      .limit(1600);
    if (error) throw error;
    return (data ?? []) as { day: string; mantra: string; rounds: number }[];
  }, []);
}

/**
 * The devotee's total rounds ever recorded - the dashboard's "all time"
 * figure. Calls the `japa_all_time_total` Postgres function (db/schema.sql),
 * which sums in the database: history is unbounded, so this is exactly the
 * case that must NOT ship every row to the browser.
 */
export async function getAllTimeTotal(userId: string): Promise<number> {
  if (!userId) return 0;
  return safely(async () => {
    const { data, error } = await supabase!.rpc("japa_all_time_total");
    if (error) throw error;
    return typeof data === "number" ? data : 0;
  }, 0);
}

/**
 * Per-day totals (summed across mantras) from `sinceDate` (inclusive,
 * "YYYY-MM-DD") through today, ascending. One bounded query - the caller
 * decides the window (the dashboard passes the first of the current
 * month), so this never has to guess a safe limit for "all of history".
 */
export async function getDailyRounds(userId: string, sinceDate: string): Promise<DailyRounds[]> {
  if (!userId) return [];
  return safely(async () => {
    const { data, error } = await supabase!
      .from("japa_rounds")
      .select("day, rounds")
      .eq("user_id", userId)
      .gte("day", sinceDate)
      .order("day", { ascending: true })
      .limit(400);
    if (error) throw error;

    const byDay = new Map<string, number>();
    for (const row of (data ?? []) as { day: string; rounds: number }[]) {
      byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.rounds);
    }
    return [...byDay.entries()].map(([day, rounds]) => ({ day, rounds }));
  }, []);
}

export type MonthlyTotal = { month: string; rounds: number }; // month: "YYYY-MM"

/**
 * Per-month totals for one calendar year, only the months that have any
 * rounds. One bounded query (at most 366 daily rows for the year), bucketed
 * client-side - cheap and simple at this scale (a single devotee-year),
 * unlike the year-total below which is worth doing in Postgres instead.
 */
export async function getMonthlyTotals(userId: string, year: number): Promise<MonthlyTotal[]> {
  if (!userId) return [];
  return safely(async () => {
    const { data, error } = await supabase!
      .from("japa_rounds")
      .select("day, rounds")
      .eq("user_id", userId)
      .gte("day", `${year}-01-01`)
      .lte("day", `${year}-12-31`)
      .limit(400);
    if (error) throw error;

    const byMonth = new Map<string, number>();
    for (const row of (data ?? []) as { day: string; rounds: number }[]) {
      const month = row.day.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + row.rounds);
    }
    return [...byMonth.entries()]
      .map(([month, rounds]) => ({ month, rounds }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, []);
}

/**
 * The devotee's total rounds for one calendar year (defaults to the
 * current year - the dashboard's "this year" figure). Calls the
 * `japa_year_total` Postgres function (db/schema.sql), which sums in the
 * database rather than shipping a year's worth of daily rows to the
 * browser just to add them up.
 */
export async function getYearlyTotals(userId: string, year: number = new Date().getFullYear()): Promise<number> {
  if (!userId) return 0;
  return safely(async () => {
    const { data, error } = await supabase!.rpc("japa_year_total", { p_year: year });
    if (error) throw error;
    return typeof data === "number" ? data : 0;
  }, 0);
}
