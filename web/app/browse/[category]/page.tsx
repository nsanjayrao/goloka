import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryBanner } from "@/components/category-banner";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { VideoGrid } from "@/components/video-grid";
import {
  CATEGORY_PAGE_SIZE,
  getChannelsInCategory,
  getVideoCount,
  getVideosByCategory,
  getVideosPage,
} from "@/lib/data";
import type { DurationBucket } from "@/lib/types";
import { safeDecodeURIComponent } from "@/lib/utils";

const DURATION_VALUES: DurationBucket[] = ["short", "medium", "long"];

// Next.js 16: `params` and `searchParams` are Promises now (see
// node_modules/next/dist/docs .../18-upgrading.md "Async Request APIs"),
// so both need `await`.
type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ channel?: string; duration?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const decoded = safeDecodeURIComponent(category);
  return {
    title: decoded ?? "Browse",
    // `category` is the already-encoded route segment, so it drops straight
    // into the canonical path without re-encoding.
    alternates: { canonical: `/browse/${category}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: rawCategory } = await params;
  const category = safeDecodeURIComponent(rawCategory);
  if (category === null) notFound(); // malformed percent-encoding -> 404, not 500
  const query = await searchParams;

  const channelId = query.channel ? Number(query.channel) : undefined;
  const duration = DURATION_VALUES.includes(query.duration as DurationBucket)
    ? (query.duration as DurationBucket)
    : undefined;

  const filters = { category, channelId, duration };
  const hasActiveFilters = channelId !== undefined || duration !== undefined;

  // `categoryCount` decides whether the category itself exists/has any
  // content at all (the full-page empty state below) and is the number the
  // banner shows - the category's stable identity, unaffected by filters.
  // `bannerVideo` is the newest video in the category (filter-independent),
  // so the banner artwork matches the poster the user clicked to get here.
  // `filteredCount` is shown near the grid ONLY when filters narrow the
  // set, so the banner's count never lies but the filtered total is still
  // visible.
  const [categoryCount, channels, videos, bannerVideos] = await Promise.all([
    getVideoCount({ category }),
    getChannelsInCategory(category),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
    getVideosByCategory(category, 1),
  ]);
  const filteredCount = hasActiveFilters ? await getVideoCount(filters) : categoryCount;

  if (categoryCount === 0) {
    return (
      <Container className="py-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{category}</h1>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <CategoryBanner
        category={category}
        thumbnail={bannerVideos[0]?.thumbnail_url ?? null}
        count={categoryCount}
      />

      {channels.length > 0 && (
        <div className="mt-6">
          <FilterChips
            category={category}
            channels={channels}
            activeChannelId={channelId}
            activeDuration={duration}
          />
        </div>
      )}

      {hasActiveFilters && (
        <p className="mt-4 text-sm text-text-muted">
          Showing {filteredCount} of {categoryCount} video{categoryCount === 1 ? "" : "s"}
        </p>
      )}

      <div className="mt-8">
        {/* `key` forces a remount (and fresh state) whenever the filters
            change, since VideoGrid otherwise only reads `initialVideos` on
            first mount. */}
        <VideoGrid key={`${channelId ?? "all"}-${duration ?? "all"}`} initialVideos={videos} filters={filters} />
      </div>
    </Container>
  );
}
