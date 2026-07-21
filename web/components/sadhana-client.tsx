"use client"; // the whole page is per-user: session, one devotee's own record.

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { signInWithGoogle, signOut, useSession } from "@/lib/auth";
import {
  getDailyRounds,
  getMonthlyTotals,
  getYearlyTotals,
  type DailyRounds,
  type MonthlyTotal,
} from "@/lib/japa-tracking";
import { todayKey } from "@/lib/rounds";

type SadhanaData = {
  userId: string;
  daily: DailyRounds[]; // this month, per day (ascending)
  months: MonthlyTotal[]; // this year, per month
  yearTotal: number;
};

// Month names via Intl so the history reads in the devotee's own locale
// without another catalog of translated month strings to keep in sync.
function monthLabel(month: string, locale: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: "long" });
}

function weekdayShort(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: "narrow" });
}

// One reverent figure - a number held, not celebrated. Tokens only.
function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-feature border border-hairline bg-surface px-5 py-6 text-center">
      <div className="font-heading text-4xl text-text tabular-nums sm:text-5xl">{value}</div>
      <div className="mt-2 text-[12px] uppercase tracking-[0.18em] text-text-muted">{label}</div>
    </div>
  );
}

// A quiet month grid: one cell per day of the current month, days with
// rounds carry a soft gold weight proportional to the count. Never a
// heatmap scoreboard - just the devotee's own month, at a glance, held
// gently. Empty days are plain surface, today is ringed so the eye finds
// "now" without any "you missed these" language anywhere.
function MonthGrid({
  daily,
  locale,
  t,
}: {
  daily: DailyRounds[];
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
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
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const rounds = byDay.get(key) ?? 0;
          const isToday = key === today;
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
                isToday ? "border-flame text-text" : "border-hairline/50 text-text-muted"
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

export function SadhanaClient() {
  const { session, hydrated } = useSession();
  const t = useTranslations("sadhana");
  const tButtons = useTranslations("buttons");
  const activeLocale = useLocale();

  const [data, setData] = useState<SadhanaData | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const userId = session.user.id;
    const now = new Date();
    const year = now.getFullYear();
    const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    Promise.all([
      getDailyRounds(userId, monthStart),
      getMonthlyTotals(userId, year),
      getYearlyTotals(userId, year),
    ]).then(([daily, months, yearTotal]) => {
      if (!cancelled) setData({ userId, daily, months, yearTotal });
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const current = session && data?.userId === session.user.id ? data : null;
  const loaded = current !== null;

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

  const today = todayKey();
  const todayRounds = current?.daily.find((d) => d.day === today)?.rounds ?? 0;
  const monthRounds = (current?.daily ?? []).reduce((sum, d) => sum + d.rounds, 0);
  const yearRounds = current?.yearTotal ?? 0;
  const months = current?.months ?? [];
  const now = new Date();

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

      {/* Today / this month / this year - three quiet figures. */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Figure label={t("today")} value={todayRounds} />
        <Figure label={t("thisMonth")} value={monthRounds} />
        <Figure label={t("thisYear")} value={yearRounds} />
      </div>

      {/* This month, day by day. */}
      <section className="mt-12">
        <h2 className="font-heading text-2xl text-text">
          {now.toLocaleDateString(activeLocale, { month: "long", year: "numeric" })}
        </h2>
        {!loaded ? (
          <p className="mt-4 text-sm text-text-muted">{tButtons("loading")}</p>
        ) : monthRounds === 0 ? (
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-text-muted">{t("emptyMonth")}</p>
        ) : (
          <div className="mt-5 max-w-md">
            <MonthGrid daily={current!.daily} locale={activeLocale} t={t} />
          </div>
        )}
      </section>

      {/* This year, month by month - a clean list, newest month first. */}
      {loaded && months.length > 0 && (
        <section className="mt-12">
          <h2 className="font-heading text-2xl text-text">{t("thisYearHeading")}</h2>
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
        </section>
      )}

      <p className="mt-12 max-w-2xl text-[13px] leading-relaxed text-text-muted/80">{t("footNote")}</p>
    </div>
  );
}
