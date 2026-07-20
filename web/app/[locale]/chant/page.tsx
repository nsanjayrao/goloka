import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { ChantSpace } from "@/components/chant-space";
import { Container } from "@/components/container";
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
          the hero, reused verbatim (DESIGN.md #5.2 / #6), so this space
          feels like sitting before a lamp rather than a UI screen. */}
      <div className="lamp dim" aria-hidden="true" />
      <Container className="page-top pb-16">
        <ChantSpace />
      </Container>
    </div>
  );
}
