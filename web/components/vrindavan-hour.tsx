"use client"; // the clock is read in the browser. A neutral server snapshot
// (null) means SSR and the first client render agree, so there is no
// hydration mismatch and nothing is ever baked into the ISR cache.

import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { keyForHour, type PeriodKey } from "@/lib/temple-period";

// The hour in Vrindavan (2026-07-23).
//
// Everything else time-aware in this app describes the visitor's OWN hour -
// their lamp, their light, their ārati. This one line points somewhere else
// entirely: at the real hour in the real Vrindavan, where real devotees are
// awake and singing at this moment.
//
// That is the whole difference between an app that simulates a temple and
// an app connected to one, and it costs a single line of text. Aliveness is
// not more motion; it is a pointer at something true.
const VRINDAVAN_TZ = "Asia/Kolkata";

/** The hour (0-23) in Vrindavan right now, from the visitor's own clock -
 * no network call, no API, just the timezone database every browser ships.
 *
 * Two different formatters on purpose. The HOUR is a computation, so it is
 * parsed in a fixed locale with an explicit `hourCycle: "h23"` - `hour12:
 * false` is the flag with a long history of resolving to the h24 cycle
 * ("24" at midnight) on some engines, which would fall through every branch
 * of keyForHour. The LABEL is display text, so it follows the visitor's own
 * locale: Devanagari numerals for /hi, Bengali for /bn, and 24-hour time for
 * /ru, which never uses am/pm. */
function vrindavanNow(locale: string): { hour: number; label: string } {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: VRINDAVAN_TZ,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now)
  );
  const label = new Intl.DateTimeFormat(locale, {
    timeZone: VRINDAVAN_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);
  return { hour, label };
}

// Recomputed on read; the subscribe is a no-op because a minute's drift in
// a line like this is not worth a timer running for the whole session.
const subscribeNever = () => () => {};

export function VrindavanHour() {
  const t = useTranslations("vrindavan");
  const locale = useLocale();

  const snapshot = useSyncExternalStore(
    subscribeNever,
    () => {
      const { hour, label } = vrindavanNow(locale);
      return `${keyForHour(hour)}|${label}`;
    },
    // Server and first client render: nothing. The line simply appears once
    // the browser has a clock.
    () => null
  );

  // The <p> is rendered EVEN WHEN EMPTY, and .vrindavan-hour reserves one
  // line's height. Returning null here instead pushed everything below it down
  // the moment the clock arrived, and - because this is the first child of its
  // movement - also changed which element the movement's spacing rule matched.
  // Reserving the box turns that into a fade-in of text into space that was
  // already there.
  const parsed = snapshot ? (snapshot.split("|") as [PeriodKey, string]) : null;

  return (
    <p className="vrindavan-hour gutter">
      {parsed && (
        <>
          {t("now", { time: parsed[1] })} <span>{t(parsed[0])}</span>
        </>
      )}
    </p>
  );
}
