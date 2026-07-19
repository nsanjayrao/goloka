import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";
import { getSpeakerChannels } from "@/lib/data";
import { localizedAlternates } from "@/lib/site";
import { SPEAKER_HANDLES } from "@/lib/speakers";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Spiritual Leaders",
    description: "Browse Goloka's curated ISKCON teachers and speakers by name.",
    alternates: localizedAlternates(locale, "/leaders"),
  };
}

// Static + ISR like /browse - the roster and counts change slowly (only when
// the owner curates lib/speakers.ts or new videos sync in).
export const revalidate = 1800;

// A parallel "browse by who's teaching" dimension to /browse's "browse by
// topic" (DESIGN.md's category grid) - linked FROM /browse rather than added
// as a 4th top-level nav destination, since the app's nav is deliberately
// fixed at Home/Browse/Search (DESIGN.md #4 "App shell").
export default async function LeadersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.leaders");
  const tEmpty = await getTranslations("emptyState");
  const speakers = await getSpeakerChannels(SPEAKER_HANDLES);

  if (speakers.length === 0) {
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{t("h1")}</h1>
        <EmptyState message={tEmpty("default")} />
      </Container>
    );
  }

  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{t("h1")}</h1>
      <p className="mt-2 max-w-xl text-text-muted">{t("intro")}</p>

      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {speakers.map(({ channel, videoCount }) => (
          <Link
            key={channel.id}
            href={`/channel/${encodeURIComponent(channel.handle!)}`}
            className="group flex flex-col items-center gap-2 text-center outline-none"
          >
            {channel.thumbnail_url ? (
              <Image
                src={channel.thumbnail_url}
                alt=""
                width={112}
                height={112}
                className="size-24 rounded-full object-cover ring-1 ring-border transition-transform duration-200 ease-out group-hover:scale-105 sm:size-28"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-surface-2 font-heading text-3xl text-text-muted ring-1 ring-border sm:size-28">
                {channel.title.charAt(0)}
              </div>
            )}
            <span className="line-clamp-2 text-[15px] font-medium leading-snug text-text group-hover:text-accent-strong">
              {channel.title}
            </span>
            <span className="text-[13px] text-text-muted">
              {videoCount} video{videoCount === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
