import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { ChantWithTracking } from "@/components/chant-with-tracking";
import { Container } from "@/components/container";
import { TempleLamp } from "@/components/temple-lamp";
import { localizedAlternates } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Chant",
    description:
      "A still, quiet space to chant the mahā-mantra and keep count of your rounds — nothing tracked, nothing kept but today.",
    alternates: localizedAlternates(locale, "/chant"),
  };
}

// A still place to chant, not a feature to engage with (see the component
// for the full mood note). This page carries no data fetching and stays a
// thin server shell around the one client island that needs runtime state
// - ChantSpace - the same "keep client boundaries thin" rule the rest of
// the app follows.
export default async function ChantPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative overflow-hidden">
      {/* The breathing āratī lamp, low intensity - the same living warmth as
          the hero, now also time-of-day aware (DESIGN.md #5.2 / #5.13 / #6),
          so this space feels like sitting before a REAL lamp, whose light
          actually differs at dawn and at dusk, rather than a UI screen. */}
      <TempleLamp dim />
      <Container className="page-top pb-16">
        {/* ChantWithTracking is a thin client wrapper: when signed in, it
            records each completed round to the devotee's /sadhana journal;
            signed out, the chant space behaves exactly as before. */}
        <ChantWithTracking />
      </Container>
    </div>
  );
}
