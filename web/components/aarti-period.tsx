"use client"; // the visitor's LOCAL hour decides the label, and the server
// can't know their timezone - so the server renders a sensible default and
// the client corrects it on hydration.

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { Link } from "@/i18n/navigation";

// Time-aware temple period (DESIGN.md #5.4) - the hero eyebrow follows the
// temple day: Maṅgala-ārati 4-8, Śṛṅgāra-darśana 8-12, Rāja-bhoga 12-16,
// Sandhyā-ārati 16-21, Śayana otherwise. Each period is now also a doorway:
// a destination plus a soft invitation, so the label becomes a tappable
// entry into what's actually happening at the temple right now.
//
// The period LABEL (e.g. "Maṅgala-ārati · the day begins") is fixed
// liturgical Sanskrit terminology and stays identical in every locale, like
// the mahā-mantra (i18n plan goal #4/#5); only the `hintKey` - the soft
// invitation after it ("join the morning darshan") - is translated.
//
// NOTE: the "/#live" destinations depend on the live section carrying
// id="live" - that's owned elsewhere. Until it exists, the link just lands
// on the home page top, which is a graceful fallback, not a broken link.
type Period = {
  label: string;
  href: string;
  hintKey: "mangalaHint" | "shringaraHint" | "rajabhogaHint" | "sandhyaHint" | "shayanaHint";
};

type PeriodKey = "mangala" | "shringara" | "rajabhoga" | "sandhya" | "shayana";

// Keyed by a stable string (not an object literal) so the useSyncExternalStore
// snapshot below stays a primitive - React compares snapshots with Object.is,
// and a fresh object on every render would never be considered "unchanged".
const PERIODS: Record<PeriodKey, Period> = {
  mangala: {
    label: "Maṅgala-ārati · the day begins",
    href: "/#live",
    hintKey: "mangalaHint",
  },
  shringara: {
    label: "Śṛṅgāra-darśana · morning worship",
    href: "/#live",
    hintKey: "shringaraHint",
  },
  rajabhoga: {
    label: "Rāja-bhoga · midday offering",
    href: "/browse/Lectures",
    hintKey: "rajabhogaHint",
  },
  sandhya: {
    label: "Sandhyā-ārati · evening lamps",
    href: "/#live",
    hintKey: "sandhyaHint",
  },
  shayana: {
    label: "Śayana · the temple rests",
    href: "/topic/japa",
    hintKey: "shayanaHint",
  },
};

const DEFAULT_KEY: PeriodKey = "sandhya";

function keyForHour(hour: number): PeriodKey {
  if (hour >= 4 && hour < 8) return "mangala";
  if (hour >= 8 && hour < 12) return "shringara";
  if (hour >= 12 && hour < 16) return "rajabhoga";
  if (hour >= 16 && hour < 21) return "sandhya";
  return "shayana";
}

// A client-only snapshot, not useEffect+setState: useSyncExternalStore's
// server snapshot (the default) and client snapshot (the real local-hour
// key) is exactly the "value the server can't know" pattern the codebase
// already uses for localStorage (lib/recently-watched.ts). The empty
// subscribe is fine - the key only needs to be right at render time, and
// it's stable within an hour (Object.is on equal strings).
const subscribeNever = () => () => {};

export function AartiPeriod() {
  const key = useSyncExternalStore(
    subscribeNever,
    () => keyForHour(new Date().getHours()),
    () => DEFAULT_KEY
  );
  const period = PERIODS[key];
  const t = useTranslations("aarti");
  const hint = t(period.hintKey);

  return (
    <Link href={period.href} className="eyebrow rise" aria-label={`${period.label} — ${hint}`}>
      {period.label}
      <span className="eyebrow-hint"> · {hint} →</span>
    </Link>
  );
}
