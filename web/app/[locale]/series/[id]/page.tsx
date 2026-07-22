import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import { getSeriesByPlaylistId, getSeriesEpisodes } from "@/lib/data";
import { cleanTitle, formatDuration } from "@/lib/format";
import { localizedAlternates } from "@/lib/site";

// A whole series (a channel's own YouTube playlist) inside Goloka, in
// order - so a devotee who met episode 10 first can simply start at
// episode 1 (the wound this page heals: that walk used to require leaving
// for YouTube). Metadata and links only: every row is a /watch link to the
// standard embed - index, never host.
//
// Dynamic like /watch/[id]: looked up per-request by the YouTube playlist
// id (URL-safe by construction: A-Za-z0-9_-).
type Props = { params: Promise<{ locale: string; id: string }> };

const getSeries = cache(getSeriesByPlaylistId);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const series = await getSeries(id);
  if (!series) return { title: "Series" };
  return {
    title: series.title,
    description:
      series.description?.replace(/\s+/g, " ").trim().slice(0, 160) ||
      `A series of ${series.item_count} parts${series.channel ? ` from ${series.channel.title}` : ""} on Goloka.`,
    alternates: localizedAlternates(locale, `/series/${id}`),
  };
}

export default async function SeriesPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("seriesPage");
  const series = await getSeries(id);
  if (!series) notFound();

  const episodes = await getSeriesEpisodes(series.id);

  return (
    <Container className="page-top pb-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-marigold">{t("kicker")}</p>
        <h1 className="mt-2 font-heading text-3xl leading-snug text-text sm:text-4xl">
          {series.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted">
          {series.channel &&
            (series.channel.handle ? (
              <Link
                href={`/channel/${encodeURIComponent(series.channel.handle)}`}
                className="rounded-full border border-border bg-surface px-3 py-1 text-text outline-none transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent"
              >
                {series.channel.title}
              </Link>
            ) : (
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-text">
                {series.channel.title}
              </span>
            ))}
          <span>{t("episodesIndexed", { count: episodes.length, total: series.item_count })}</span>
        </div>

        {series.description && (
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-text-muted line-clamp-3">
            {series.description}
          </p>
        )}

        {episodes.length === 0 ? (
          <p className="mt-10 max-w-md text-[15px] leading-relaxed text-text-muted">{t("empty")}</p>
        ) : (
          <ol className="mt-8 divide-y divide-border">
            {episodes.map((episode) => (
              <li key={episode.video.youtube_video_id}>
                <Link
                  href={`/watch/${episode.video.youtube_video_id}`}
                  className="group flex items-center gap-4 py-3 outline-none"
                >
                  {/* The TRUE playlist slot, 1-based - so numbering matches
                      what the devotee saw on YouTube even when we haven't
                      indexed every item in between. */}
                  <span className="w-8 shrink-0 text-right font-heading text-[15px] tabular-nums text-text-muted">
                    {episode.position + 1}
                  </span>
                  <span className="relative block aspect-video w-32 shrink-0 overflow-hidden rounded-lg sm:w-40">
                    {episode.video.thumbnail_url && (
                      <Image
                        src={episode.video.thumbnail_url}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] leading-snug text-text transition-colors group-hover:text-flame group-focus-visible:text-flame">
                      {cleanTitle(episode.video.title)}
                    </span>
                    {episode.video.duration_seconds != null && (
                      <span className="mt-1 block text-[12px] text-text-muted">
                        {formatDuration(episode.video.duration_seconds)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Container>
  );
}
