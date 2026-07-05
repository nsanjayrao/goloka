import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { getSpeakerChannels } from "@/lib/data";
import { SPEAKER_HANDLES } from "@/lib/speakers";

export const metadata: Metadata = {
  title: "Spiritual Leaders",
  description: "Browse Goloka's curated ISKCON teachers and speakers by name.",
  alternates: { canonical: "/leaders" },
};

// Static + ISR like /browse - the roster and counts change slowly (only when
// the owner curates lib/speakers.ts or new videos sync in).
export const revalidate = 1800;

// A parallel "browse by who's teaching" dimension to /browse's "browse by
// topic" (DESIGN.md's category grid) - linked FROM /browse rather than added
// as a 4th top-level nav destination, since the app's nav is deliberately
// fixed at Home/Browse/Search (DESIGN.md #4 "App shell").
export default async function LeadersPage() {
  const speakers = await getSpeakerChannels(SPEAKER_HANDLES);

  if (speakers.length === 0) {
    return (
      <Container className="py-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">Spiritual Leaders</h1>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">Spiritual Leaders</h1>
      <p className="mt-2 max-w-xl text-text-muted">
        ISKCON teachers and speakers whose talks, kirtans and classes are indexed on Goloka.
      </p>

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
            <span className="line-clamp-2 text-[15px] font-medium leading-snug text-text group-hover:text-accent">
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
