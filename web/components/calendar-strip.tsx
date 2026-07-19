import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { daysUntil, nextEkadashi, todaysEkadashi } from "@/lib/vaishnava-calendar";

// A quiet full-bleed band (DESIGN.md #4 shared --pad gutter) between the
// live strip and the rest of the home page - deliberately NOT a full
// .home-section with a kicker+title section-head, just a slim gold-hairline
// bar so it doesn't compete with the rows around it for attention. Server
// component: the ekadashi table is static data, no client state needed -
// which is also why this is two sibling <Link>s rather than one link
// wrapping an "Add to calendar" link (nesting an <a> inside an <a> is
// invalid HTML, and stopping that click's propagation would need a client
// component just for this one bar).
// Renders nothing only if the registry is somehow exhausted (see
// vaishnava-calendar.ts - re-run the research past 2027 before that
// happens); every other day it shows either the next ekadashi's countdown
// or today's, flame-highlighted.
export function CalendarStrip({ now = new Date() }: { now?: Date }) {
  const t = useTranslations("calendarStrip");
  const today = todaysEkadashi(now);
  const upcoming = today ?? nextEkadashi(now);
  if (!upcoming) return null;

  const isToday = today !== null;
  const days = isToday ? 0 : daysUntil(upcoming.date, now);
  const state = isToday ? t("today") : t("inDays", { days });

  return (
    <div className={`cal-strip${isToday ? " is-today" : ""}`}>
      <div className="cal-strip-row gutter">
        <Link href="/topic/ekadashi" className="cal-strip-main">
          <span className="cal-strip-kicker">{t("kicker")}</span>
          <span className="cal-strip-name">{upcoming.name}</span>
        </Link>
        <div className="cal-strip-meta">
          <Link href="/topic/ekadashi" className="cal-strip-state">
            {state}
          </Link>
          {/* A plain anchor, not the locale-aware Link: /ekadashi.ics
              deliberately lives OUTSIDE the [locale] route tree (i18n plan
              goal #3), so it must never gain a /hi, /bn, /ru, /es prefix. */}
          <a href="/ekadashi.ics" className="cal-strip-ics">
            {t("addToCalendar")}
          </a>
        </div>
      </div>
    </div>
  );
}
