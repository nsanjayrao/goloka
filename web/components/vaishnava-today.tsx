import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { todaysObservances } from "@/lib/vaishnava-observances";

// A quiet honoring card for the ācārya-days registry (lib/vaishnava-observances.ts) -
// the mood is Radharani's own: on an appearance day, gentle joy ("we honor");
// on a disappearance day, tender remembrance, not celebration ("we
// remember") - a touch more subdued visually too (muted border, no glow),
// same "bow the head, don't throw a party" idea as the design brief.
// Server component: the registry is static hand-researched data, no client
// state needed (same reasoning as CalendarStrip).
//
// Renders null on an ordinary day - no empty wrapper, no gap left behind
// (ContinueWatchingShelf's rationale: a wrapper with null children still
// occupies a flex slot). The main session decides where this is placed;
// this file only exports it.
//
// Almost always at most one entry today, but occasionally two personalities
// share a tithi (see vaishnava-observances.ts) - so this maps over an
// array and renders one card per entry rather than assuming a single one.
export function VaishnavaToday({ now = new Date() }: { now?: Date }) {
  const t = useTranslations("vaishnavaToday");
  const todays = todaysObservances(now);
  if (todays.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {todays.map((entry) => {
        const isDisappearance = entry.kind === "disappearance";
        const href = entry.topicSlug
          ? `/topic/${entry.topicSlug}`
          : entry.searchQuery
            ? `/search?q=${encodeURIComponent(entry.searchQuery)}`
            : null;

        return (
          <div
            key={`${entry.date}-${entry.name}`}
            className={`rounded-feature border p-6 sm:p-8 ${
              isDisappearance
                ? "border-border bg-surface/60"
                : "border-hairline bg-gradient-to-br from-surface to-bg"
            }`}
          >
            <span className="block text-[12px] uppercase tracking-[0.22em] text-text-muted">
              {t("kicker")}
            </span>
            <h2
              className={`mt-2 font-heading text-[22px] leading-snug sm:text-[26px] ${
                isDisappearance ? "text-text-muted" : "text-text"
              }`}
            >
              {t(isDisappearance ? "remember" : "honor", { name: entry.name })}
            </h2>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-text-muted">{entry.note}</p>
            {href && (
              <Link
                href={href}
                className="mt-4 inline-block text-[13px] font-medium text-accent-strong underline-offset-4 hover:underline"
              >
                {t("hearMore")}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
