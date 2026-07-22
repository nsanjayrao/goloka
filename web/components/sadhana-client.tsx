"use client"; // the whole page is per-user: session, one devotee's own record.

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { signInWithGoogle, signOut, useSession } from "@/lib/auth";
import {
  getAllTimeTotal,
  getMonthlyTotals,
  getRecentJapaRows,
  type MonthlyTotal,
} from "@/lib/japa-tracking";
import { getMantra } from "@/lib/mantras";
import { todayKey } from "@/lib/rounds";
import { useSankalpa } from "@/lib/sankalpa";
import {
  computeUnbrokenDays,
  mantraTotalsForMonth,
  milestoneReached,
  monthSlice,
  shiftMonth,
  sumByDay,
  type DayTotal,
  type JapaRow,
} from "@/lib/sadhana-insights";

// ---- Data shape ----
// ONE bounded query (the last ~400 days of raw rows) powers everything
// recent: the four figures, the unbroken-days line, any month grid within
// the last year, and the per-mantra split - the pure math lives in
// lib/sadhana-insights.ts (unit-tested). The year section fetches its
// months separately so PAST years remain browsable beyond the window.

type RecentData = {
  userId: string;
  rows: JapaRow[];
  allTime: number;
};

type YearData = {
  userId: string;
  year: number;
  months: MonthlyTotal[];
};

// How far back the recent window reaches: 400 days always covers the whole
// current year and 12 whole months of grid navigation.
const RECENT_WINDOW_DAYS = 400;
// The month grid can walk this many months back - every one of them is
// fully inside the recent window, so navigation never needs a re-fetch.
const GRID_MONTHS_BACK = 12;

function monthLabel(month: string, locale: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function weekdayShort(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: "narrow" });
}

/** The display name for a recorded mantra id: current ids (lib/mantras.ts)
 * and the legacy 'maha_mantra' rows both resolve through getMantra, whose
 * fallback IS the mahā-mantra. */
function mantraDisplayName(id: string): string {
  return getMantra(id).shortName;
}

// One reverent figure - a number held, not celebrated. While its value is
// still on its way, a quiet skeleton holds the space (no 0 that jumps).
function Figure({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-feature border border-hairline bg-surface px-5 py-6 text-center">
      {value === null ? (
        <div className="skeleton mx-auto h-10 w-16 sm:h-12" />
      ) : (
        <div className="font-heading text-4xl text-text tabular-nums sm:text-5xl">{value}</div>
      )}
      <div className="mt-2 text-[12px] uppercase tracking-[0.18em] text-text-muted">{label}</div>
    </div>
  );
}

// A quiet month grid: one cell per day of the shown month, days with
// rounds carry a soft gold weight proportional to the count. Never a
// heatmap scoreboard - just the devotee's own month, at a glance, held
// gently. Empty days are plain surface, today is ringed so the eye finds
// "now" without any "you missed these" language anywhere.
function MonthGrid({
  monthKey,
  daily,
  vow,
  locale,
  t,
}: {
  monthKey: string; // "YYYY-MM"
  daily: DayTotal[]; // already sliced to this month
  /** The devotee's sankalpa (lib/sankalpa.ts), or null. Days that met it
   * carry a slightly warmer border - and days that didn't look exactly
   * like every other day; the grid never marks a falling-short. */
  vow: number | null;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [year, month0] = monthKey.split("-").map(Number);
  const month = month0 - 1; // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const today = todayKey();

  const byDay = new Map(daily.map((d) => [d.day, d.rounds]));
  const maxRounds = Math.max(1, ...daily.map((d) => d.rounds));

  // Weekday header labels (narrow), starting Sunday to match getDay().
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    weekdayShort(new Date(2024, 11, 1 + i), locale)
  );

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekdayLabels.map((label, i) => (
          <div key={i} className="pb-1 text-center text-[11px] text-text-muted/70">
            {label}
          </div>
        ))}
        {cells.map((dayNum, i) => {
          if (dayNum === null) return <div key={`pad-${i}`} aria-hidden />;
          const key = `${monthKey}-${String(dayNum).padStart(2, "0")}`;
          const rounds = byDay.get(key) ?? 0;
          const isToday = key === today;
          const vowMet = vow !== null && rounds >= vow;
          // Gold weight: a gentle opacity ramp, floored so any chanting is
          // visible but never shouting. No number badges - the calm reading
          // is "these were days of chanting", not a per-day score.
          const intensity = rounds > 0 ? 0.28 + 0.62 * (rounds / maxRounds) : 0;
          return (
            <div
              key={key}
              title={
                rounds > 0
                  ? t("dayRounds", { day: dayNum, count: rounds })
                  : t("dayNone", { day: dayNum })
              }
              className={`flex aspect-square items-center justify-center rounded-lg border text-[12px] tabular-nums ${
                isToday
                  ? "border-flame text-text"
                  : vowMet
                    ? "border-marigold/60 text-text-muted"
                    : "border-hairline/50 text-text-muted"
              }`}
              style={
                rounds > 0
                  ? { backgroundColor: `color-mix(in srgb, var(--marigold) ${Math.round(intensity * 100)}%, transparent)` }
                  : undefined
              }
            >
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Twelve marigold bars on shyama - hand-drawn SVG, tokens only, no chart
// library (twelve rectangles never justify a dependency). The month list
// below carries the same numbers accessibly; each bar still gets a <title>
// for pointer hover.
function YearBars({
  months,
  year,
  locale,
  t,
}: {
  months: MonthlyTotal[];
  year: number;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const byMonth = new Map(months.map((m) => [m.month, m.rounds]));
  const values = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { key, rounds: byMonth.get(key) ?? 0 };
  });
  const max = Math.max(1, ...values.map((v) => v.rounds));

  const BAR_W = 20;
  const GAP = 8;
  const H = 96;
  const LABEL_H = 16;
  const width = 12 * BAR_W + 11 * GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${H + LABEL_H}`}
      className="mt-5 w-full max-w-md"
      role="img"
      aria-label={t("chartAria", { year })}
    >
      {values.map((v, i) => {
        const h = v.rounds > 0 ? Math.max(3, Math.round((v.rounds / max) * H)) : 0;
        const x = i * (BAR_W + GAP);
        const label = new Date(year, i, 1).toLocaleDateString(locale, { month: "narrow" });
        return (
          <g key={v.key}>
            {v.rounds > 0 && (
              <rect x={x} y={H - h} width={BAR_W} height={h} rx={3} fill="var(--marigold)" opacity={0.85}>
                <title>{`${monthLabel(v.key, locale)}: ${v.rounds}`}</title>
              </rect>
            )}
            <text
              x={x + BAR_W / 2}
              y={H + LABEL_H - 4}
              textAnchor="middle"
              fontSize="9"
              fill="var(--muted)"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SadhanaClient() {
  const { session, hydrated } = useSession();
  const t = useTranslations("sadhana");
  const tButtons = useTranslations("buttons");
  const activeLocale = useLocale();
  const sankalpa = useSankalpa();

  const today = todayKey();
  const currentMonth = today.slice(0, 7);
  const currentYear = Number(today.slice(0, 4));

  const [recent, setRecent] = useState<RecentData | null>(null);
  const [yearData, setYearData] = useState<YearData | null>(null);
  const [shownMonth, setShownMonth] = useState(currentMonth);
  const [shownYear, setShownYear] = useState(currentYear);

  // The recent window + all-time figure, once per session.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const userId = session.user.id;
    const since = new Date();
    since.setDate(since.getDate() - RECENT_WINDOW_DAYS);
    Promise.all([getRecentJapaRows(userId, todayKey(since)), getAllTimeTotal(userId)]).then(
      ([rows, allTime]) => {
        if (!cancelled) setRecent({ userId, rows, allTime });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [session]);

  // The shown year's month totals - a separate, tiny query so PAST years
  // stay browsable beyond the recent window.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const userId = session.user.id;
    getMonthlyTotals(userId, shownYear).then((months) => {
      if (!cancelled) setYearData({ userId, year: shownYear, months });
    });
    return () => {
      cancelled = true;
    };
  }, [session, shownYear]);

  const rec = session && recent?.userId === session.user.id ? recent : null;
  const yr = session && yearData?.userId === session.user.id && yearData.year === shownYear ? yearData : null;

  // Before hydration nothing personal can be known - render the neutral
  // heading so there's no layout jump either way.
  if (!hydrated) {
    return <h1 className="font-heading text-3xl text-text sm:text-4xl">{t("title")}</h1>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <h1 className="font-heading text-3xl text-text">{t("title")}</h1>
        <p className="mt-3 text-text-muted">{t("signInPrompt")}</p>
        <button type="button" onClick={signInWithGoogle} className="btn gold mt-6">
          {t("continueWithGoogle")}
        </button>
        <p className="mt-6 text-[13px] leading-relaxed text-text-muted/80">{t("privacyNote")}</p>
      </div>
    );
  }

  // Everything below derives from the one recent window - pure, tested math.
  const daily = rec ? sumByDay(rec.rows) : null;
  const todayRounds = daily ? (daily.find((d) => d.day === today)?.rounds ?? 0) : null;
  const monthRounds = daily ? monthSlice(daily, currentMonth).reduce((s, d) => s + d.rounds, 0) : null;
  // The current year sits entirely inside the 400-day window, so its total
  // is derivable without another query.
  const yearRounds = daily
    ? daily.filter((d) => d.day.startsWith(`${currentYear}-`)).reduce((s, d) => s + d.rounds, 0)
    : null;
  const unbroken = daily ? computeUnbrokenDays(daily, today) : 0;
  const milestone = yearRounds !== null ? milestoneReached(yearRounds) : null;
  const shownDaily = daily ? monthSlice(daily, shownMonth) : [];
  const shownMonthRounds = shownDaily.reduce((s, d) => s + d.rounds, 0);
  const mantraSplit = rec ? mantraTotalsForMonth(rec.rows, shownMonth) : [];

  const minMonth = shiftMonth(currentMonth, -GRID_MONTHS_BACK);
  const months = yr?.months ?? null;

  const navButton =
    "grid size-8 place-items-center rounded-full border border-hairline text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame disabled:opacity-30 disabled:hover:text-text-muted";

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-3xl text-text sm:text-4xl">{t("title")}</h1>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-text-muted transition-colors hover:text-flame"
        >
          {tButtons("signOut")}
          {session.user.email ? ` (${session.user.email})` : ""}
        </button>
      </div>

      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-muted">{t("intro")}</p>

      {/* Today / this month / this year / all time - four quiet figures. */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Figure label={t("today")} value={todayRounds} />
        <Figure label={t("thisMonth")} value={monthRounds} />
        <Figure label={t("thisYear")} value={yearRounds} />
        <Figure label={t("allTime")} value={rec ? rec.allTime : null} />
      </div>

      {/* The unbroken run and the year's milestone: shown while they live,
          SILENT otherwise - no loss language, nothing to protect. */}
      {(unbroken >= 2 || milestone !== null) && (
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-[13px] text-text-muted">
          {unbroken >= 2 && <p>{t("unbrokenDays", { count: unbroken })}</p>}
          {milestone !== null && <p>{t("milestoneYear", { count: milestone })}</p>}
        </div>
      )}

      {/* Month by month, day by day - walkable back a year. */}
      <section className="mt-12">
        <div className="flex items-center gap-4">
          <h2 className="font-heading text-2xl text-text">{monthLabel(shownMonth, activeLocale)}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShownMonth((m) => shiftMonth(m, -1))}
              disabled={shownMonth <= minMonth}
              aria-label={t("prevMonthAria")}
              className={navButton}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setShownMonth((m) => shiftMonth(m, 1))}
              disabled={shownMonth >= currentMonth}
              aria-label={t("nextMonthAria")}
              className={navButton}
            >
              ›
            </button>
          </div>
        </div>
        {!rec ? (
          <div className="skeleton mt-5 h-64 max-w-md" />
        ) : shownMonthRounds === 0 ? (
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-text-muted">{t("emptyMonth")}</p>
        ) : (
          <div className="mt-5 max-w-md">
            <MonthGrid monthKey={shownMonth} daily={shownDaily} vow={sankalpa} locale={activeLocale} t={t} />
            {/* The month's mantra split - only when more than one name was
                chanted; a single-mantra month needs no annotation. */}
            {mantraSplit.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-text-muted">
                {mantraSplit.map((m) => (
                  <span key={m.mantra}>
                    {t("mantraShare", { mantra: mantraDisplayName(m.mantra), count: m.rounds })}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* A year at a glance: twelve bars, then the month list - walkable to
          earlier years (their data lives beyond the recent window, so this
          section has its own small query). */}
      <section className="mt-12">
        <div className="flex items-center gap-4">
          <h2 className="font-heading text-2xl text-text">
            {shownYear === currentYear ? t("thisYearHeading") : t("yearHeading", { year: shownYear })}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShownYear((y) => y - 1)}
              disabled={shownYear <= currentYear - 10}
              aria-label={t("prevYearAria")}
              className={navButton}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setShownYear((y) => y + 1)}
              disabled={shownYear >= currentYear}
              aria-label={t("nextYearAria")}
              className={navButton}
            >
              ›
            </button>
          </div>
        </div>

        {months === null ? (
          <div className="skeleton mt-5 h-32 max-w-md" />
        ) : months.length === 0 ? (
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-text-muted">
            {t("emptyYear", { year: shownYear })}
          </p>
        ) : (
          <>
            <YearBars months={months} year={shownYear} locale={activeLocale} t={t} />
            <ul className="mt-4 max-w-md divide-y divide-border">
              {[...months].reverse().map((m) => (
                <li key={m.month} className="flex items-center justify-between py-3">
                  <span className="text-text">{monthLabel(m.month, activeLocale)}</span>
                  <span className="text-text-muted tabular-nums">
                    {t("roundsCount", { count: m.rounds })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="mt-12 max-w-2xl text-[13px] leading-relaxed text-text-muted/80">{t("footNote")}</p>
    </div>
  );
}
