import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";
import { localizedAlternates } from "@/lib/site";
import { EKADASHIS, toISTDateString } from "@/lib/vaishnava-calendar";
import { OBSERVANCES, type ObservanceKind } from "@/lib/vaishnava-observances";

// Static + ISR, same idiom as /browse and /topic/[slug] - the registries are
// hand-researched static data, not per-request, so this is served cached
// and rebuilt roughly every 6h (long enough that today's flame highlight is
// still correct within a day, which is all a calendar page needs).
export const revalidate = 21600;

type Props = { params: Promise<{ locale: string }> };

// Title/description are fixed English, same convention as /leaders and
// /books - only the on-page copy below is run through next-intl.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "The Vaishnava Calendar",
    description:
      "The sacred year at a glance - ekadashis, and the appearance and disappearance days of the Gaudiya Vaishnava acharyas, precisely dated for Mayapur/IST.",
    alternates: localizedAlternates(locale, "/calendar"),
  };
}

type CalendarKind = ObservanceKind | "ekadashi";

type CalendarRow = {
  date: string;
  name: string;
  kind: CalendarKind;
  note?: string;
  href?: string;
};

// Merges the two hand-researched registries (lib/vaishnava-calendar.ts's
// ekadashis and lib/vaishnava-observances.ts's acharya-days/festival-days)
// into one chronological list - they're deliberately separate source files
// (different research cadence, different helpers) but the same reverent
// "sacred year at a glance" idea, so this is the one place they meet.
function buildCalendarRows(now: Date): CalendarRow[] {
  const today = toISTDateString(now);

  const ekadashiRows: CalendarRow[] = EKADASHIS.filter((entry) => entry.date >= today).map((entry) => ({
    date: entry.date,
    name: entry.name,
    kind: "ekadashi",
    note: entry.note,
    href: "/topic/ekadashi",
  }));

  const observanceRows: CalendarRow[] = OBSERVANCES.filter((entry) => entry.date >= today).map((entry) => ({
    date: entry.date,
    name: entry.name,
    kind: entry.kind,
    note: entry.note,
    href: entry.topicSlug
      ? `/topic/${entry.topicSlug}`
      : entry.searchQuery
        ? `/search?q=${encodeURIComponent(entry.searchQuery)}`
        : undefined,
  }));

  // Array.prototype.sort is stable (spec-guaranteed since ES2019), so
  // entries that share a date (e.g. two Gosvamis on the same tithi) keep
  // their original relative order rather than shuffling on every rebuild.
  return [...ekadashiRows, ...observanceRows].sort((a, b) => a.date.localeCompare(b.date));
}

function formatDisplayDate(date: string, locale: string): string {
  // Noon UTC, not midnight - keeps the formatted calendar date stable
  // across every timezone the server or a reader's browser might be in;
  // midnight UTC on "2026-09-05" is already Sep 4 evening in the Americas.
  const d = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function CalendarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.calendar");
  const tEmpty = await getTranslations("emptyState");

  const now = new Date();
  const today = toISTDateString(now);
  const rows = buildCalendarRows(now);

  const kindLabel = (kind: CalendarKind) => {
    if (kind === "ekadashi") return t("ekadashi");
    if (kind === "appearance") return t("appearance");
    if (kind === "disappearance") return t("disappearance");
    return t("festival");
  };

  if (rows.length === 0) {
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{t("h1")}</h1>
        <EmptyState message={tEmpty("default")} />
      </Container>
    );
  }

  // Group into month headings for breathing room (DESIGN.md #4) - a flat
  // list of ~60 rows spanning a year and a half reads as a wall without one.
  const groups: { label: string; rows: CalendarRow[] }[] = [];
  for (const row of rows) {
    const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
      new Date(`${row.date}T12:00:00Z`)
    );
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.label === monthLabel) {
      currentGroup.rows.push(row);
    } else {
      groups.push({ label: monthLabel, rows: [row] });
    }
  }

  return (
    <Container className="page-top pb-16">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{t("h1")}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-muted">{t("intro")}</p>

      <div className="mt-10 flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="font-heading text-[18px] text-accent-strong">{group.label}</h2>
            <div className="mt-3 border-t border-border/60">
              {group.rows.map((row) => {
                const isToday = row.date === today;
                return (
                  <div
                    key={`${row.date}-${row.name}`}
                    className={`flex flex-col gap-1.5 border-b border-border/60 py-5 sm:flex-row sm:gap-6 ${
                      isToday ? "border-l-2 border-l-flame pl-4 sm:pl-6" : ""
                    }`}
                  >
                    <div className="shrink-0 sm:w-44">
                      <span className={`block text-[13px] ${isToday ? "text-flame" : "text-text-muted"}`}>
                        {formatDisplayDate(row.date, locale)}
                      </span>
                      {isToday && (
                        <span className="text-[11px] uppercase tracking-[0.18em] text-flame">{t("todayLabel")}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="font-heading text-[18px] text-text" title={row.name}>
                          {row.name}
                        </h3>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                          {kindLabel(row.kind)}
                        </span>
                      </div>
                      {row.note && (
                        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-text-muted">{row.note}</p>
                      )}
                      {row.href && (
                        <Link
                          href={row.href}
                          className="mt-2 inline-block text-[12px] font-medium text-accent-strong underline-offset-4 hover:underline"
                        >
                          {t("hearMore")}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}
