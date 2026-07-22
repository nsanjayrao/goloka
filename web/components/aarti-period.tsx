"use client"; // the visitor's LOCAL hour decides the label, and the server
// can't know their timezone - so the server renders a sensible default and
// the client corrects it on hydration.

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useTemplePeriod, type PeriodKey } from "@/lib/temple-period";

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

export function AartiPeriod() {
  const key = useTemplePeriod();
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
