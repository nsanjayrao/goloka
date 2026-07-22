import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Container } from "@/components/container";
import { ShareButton, WhatsAppShareButton } from "@/components/share-button";
import { TopicChips } from "@/components/topic-chips";
import { VideoGrid } from "@/components/video-grid";
import { Link } from "@/i18n/navigation";
import { CATEGORY_PAGE_SIZE, getChannelByHandle, getSeriesForChannel, getVideoCount, getVideosPage } from "@/lib/data";
import { localizedAlternates } from "@/lib/site";
import { TOPICS, TOPIC_LIST } from "@/lib/topics";
import { safeDecodeURIComponent } from "@/lib/utils";

// Dynamic like /watch/[id] - a channel page is looked up per-request by its
// handle. `params`/`searchParams` are Promises in Next.js 16 (async request
// APIs).
type Props = {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<{ topic?: string }>;
};

// React.cache dedupes within one request: generateMetadata and the page
// component both look the channel up, but only one Supabase query runs.
const getChannel = cache(getChannelByHandle);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, handle } = await params;
  const decoded = safeDecodeURIComponent(handle);
  const channel = decoded === null ? null : await getChannel(decoded);
  const { topic: topicSlug } = await searchParams;
  // A valid ?topic gets its own title/description - this IS the discovery
  // feature's soul (a trusted teacher crossed with a theme), so it needs to
  // be shareable and self-describing rather than always reading "Channel".
  // An unrecognized slug (typo, stale link) is silently ignored, same as the
  // page body below.
  const topic = topicSlug ? TOPICS[topicSlug] : undefined;

  return {
    title: channel ? (topic ? `${channel.title} on ${topic.title}` : channel.title) : "Channel",
    description: channel
      ? topic
        ? `${topic.subtitle} From ${channel.title} on Goloka.`
        : `Lectures, kirtans, and more from ${channel.title} on Goloka.`
      : undefined,
    // `handle` is the already-encoded route segment - drop it in as-is. The
    // canonical stays the bare channel page (no query param), matching how
    // /browse/[category]'s filter chips are handled.
    alternates: localizedAlternates(locale, `/channel/${handle}`),
  };
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("library");
  const decoded = safeDecodeURIComponent(handle);
  if (decoded === null) notFound(); // malformed percent-encoding -> 404, not 500
  const channel = await getChannel(decoded);
  if (!channel) notFound();

  const { topic: topicSlugParam } = await searchParams;
  // Unrecognized slug -> undefined -> treated exactly like no ?topic at all.
  const activeTopic = topicSlugParam ? TOPICS[topicSlugParam] : undefined;

  // One bounded count per registry topic (TOPIC_LIST is ~9 entries) - tells
  // us which themes this channel actually has enough of to be worth a chip,
  // and doubles as the active topic's filtered count below (no extra query).
  const topicCounts = await Promise.all(
    TOPIC_LIST.map((topic) => getVideoCount({ channelId: channel.id, topicSlug: topic.slug }))
  );
  const countBySlug = new Map(TOPIC_LIST.map((topic, i) => [topic.slug, topicCounts[i]]));

  // Chips only surface themes with enough content to be worth following
  // (~2+ videos) - plus the currently active topic if the URL already named
  // one, so a devotee who landed on a thin intersection can still toggle it
  // off from the chip row instead of only via the address bar.
  const chipTopics = TOPIC_LIST.filter(
    (topic) => (countBySlug.get(topic.slug) ?? 0) >= 2 || topic.slug === activeTopic?.slug
  );

  // Channel-only filter (no category) - the same VideoGrid/getVideosPage the
  // category page uses, now optionally crossed with a topic.
  const filters = {
    channelId: channel.id,
    ...(activeTopic ? { topicSlug: activeTopic.slug } : {}),
  };
  const [count, videos, series] = await Promise.all([
    activeTopic ? Promise.resolve(countBySlug.get(activeTopic.slug) ?? 0) : getVideoCount({ channelId: channel.id }),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
    getSeriesForChannel(channel.id, 12),
  ]);

  return (
    <Container className="page-top pb-10">
      <div className="flex items-center gap-4">
        {channel.thumbnail_url ? (
          <Image
            src={channel.thumbnail_url}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          // No avatar on file - a neutral circle with the initial, so the
          // header never has an empty gap.
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-surface-2 font-heading text-2xl text-text-muted">
            {channel.title.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{channel.title}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {count} video{count === 1 ? "" : "s"}
            {activeTopic ? ` on ${activeTopic.title}` : ""}
          </p>
        </div>
      </div>

      {chipTopics.length > 0 && (
        <div className="mt-6">
          <TopicChips handle={handle} topics={chipTopics} activeSlug={activeTopic?.slug} />
        </div>
      )}

      {activeTopic && (
        // A channel×topic intersection is precisely the kind of link a
        // devotee forwards ("this teacher, on this theme") - give it the
        // same share row as a /topic collection rather than relying on the
        // browser address bar.
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-text-muted">
          <span>{t("shareCollection")}</span>
          <WhatsAppShareButton
            title={`${channel.title} on ${activeTopic.title}`}
            path={`/channel/${handle}?topic=${activeTopic.slug}`}
          />
          <ShareButton
            title={`${channel.title} on ${activeTopic.title}`}
            path={`/channel/${handle}?topic=${activeTopic.slug}`}
          />
        </div>
      )}

      {/* The channel's series (its own playlists) - only on the unfiltered
          view, so a topic-filtered page stays about that topic. */}
      {!activeTopic && series.length > 0 && (
        <section className="mt-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-marigold">{t("seriesKicker")}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {series.map((s) => (
              <Link
                key={s.youtube_playlist_id}
                href={`/series/${s.youtube_playlist_id}`}
                className="group outline-none"
              >
                <span className="relative block aspect-video overflow-hidden rounded-lg bg-surface-2">
                  {s.thumbnail_url && (
                    <Image
                      src={s.thumbnail_url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 300px, 50vw"
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="mt-2 line-clamp-2 block text-[14px] leading-snug text-text transition-colors group-hover:text-flame group-focus-visible:text-flame">
                  {s.title}
                </span>
                <span className="mt-0.5 block text-[12px] text-text-muted">
                  {t("seriesParts", { count: s.item_count })}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8">
        {/* `key` forces a remount (and fresh "load more" state) whenever the
            active topic changes, since VideoGrid otherwise only reads
            `initialVideos` on first mount. */}
        <VideoGrid key={activeTopic?.slug ?? "all"} initialVideos={videos} filters={filters} />
      </div>
    </Container>
  );
}
