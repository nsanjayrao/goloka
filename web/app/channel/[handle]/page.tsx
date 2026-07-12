import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Container } from "@/components/container";
import { VideoGrid } from "@/components/video-grid";
import { CATEGORY_PAGE_SIZE, getChannelByHandle, getVideoCount, getVideosPage } from "@/lib/data";
import { safeDecodeURIComponent } from "@/lib/utils";

// Dynamic like /watch/[id] - a channel page is looked up per-request by its
// handle. `params` is a Promise in Next.js 16 (async request APIs).
type Props = { params: Promise<{ handle: string }> };

// React.cache dedupes within one request: generateMetadata and the page
// component both look the channel up, but only one Supabase query runs.
const getChannel = cache(getChannelByHandle);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const decoded = safeDecodeURIComponent(handle);
  const channel = decoded === null ? null : await getChannel(decoded);
  return {
    title: channel?.title ?? "Channel",
    // `handle` is the already-encoded route segment - drop it in as-is.
    alternates: { canonical: `/channel/${handle}` },
  };
}

export default async function ChannelPage({ params }: Props) {
  const { handle } = await params;
  const decoded = safeDecodeURIComponent(handle);
  if (decoded === null) notFound(); // malformed percent-encoding -> 404, not 500
  const channel = await getChannel(decoded);
  if (!channel) notFound();

  // Channel-only filter (no category) - the same VideoGrid/getVideosPage the
  // category page uses, now that category is optional in VideoPageFilters.
  const filters = { channelId: channel.id };
  const [count, videos] = await Promise.all([
    getVideoCount(filters),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
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
          </p>
        </div>
      </div>

      <div className="mt-8">
        <VideoGrid initialVideos={videos} filters={filters} />
      </div>
    </Container>
  );
}
