import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CategoryBanner } from "@/components/category-banner";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { VideoGrid } from "@/components/video-grid";
import { Link } from "@/i18n/navigation";
import {
  CATEGORY_PAGE_SIZE,
  getChannelsInCategory,
  getLanguagesInCategory,
  getVideoCount,
  getVideosPage,
} from "@/lib/data";
import { categorySubtitle } from "@/lib/category-meta";
import { localizedAlternates } from "@/lib/site";
import type { DurationBucket } from "@/lib/types";
import { safeDecodeURIComponent } from "@/lib/utils";

const DURATION_VALUES: DurationBucket[] = ["short", "medium", "long"];

// Next.js 16: `params` and `searchParams` are Promises now (see
// node_modules/next/dist/docs .../18-upgrading.md "Async Request APIs"),
// so both need `await`.
type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ channel?: string; duration?: string; sort?: string; language?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const decoded = safeDecodeURIComponent(category);
  return {
    title: decoded ?? "Browse",
    description: decoded
      ? `${decoded} on Goloka — ${categorySubtitle(decoded)?.toLowerCase() ?? "talks, teachings, and more"}.`
      : undefined,
    // `category` is the already-encoded route segment, so it drops straight
    // into the canonical path without re-encoding.
    alternates: localizedAlternates(locale, `/browse/${category}`),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category: rawCategory } = await params;
  setRequestLocale(locale);
  const tEmpty = await getTranslations("emptyState");
  const tFilters = await getTranslations("filterChips");
  const category = safeDecodeURIComponent(rawCategory);
  if (category === null) notFound(); // malformed percent-encoding -> 404, not 500
  const query = await searchParams;

  const channelId = query.channel ? Number(query.channel) : undefined;
  const duration = DURATION_VALUES.includes(query.duration as DurationBucket)
    ? (query.duration as DurationBucket)
    : undefined;
  const language = query.language || undefined;
  // Sort only reorders the same set, so it's NOT counted as an "active filter"
  // for the "Showing X of Y" line below (that's about narrowing the set).
  const sort: "recent" | "popular" = query.sort === "popular" ? "popular" : "recent";

  const filters = { category, channelId, duration, language, sort };
  const hasActiveFilters = channelId !== undefined || duration !== undefined || language !== undefined;

  // `categoryCount` decides whether the category itself exists/has any
  // content at all (the full-page empty state below) and is the number the
  // banner shows - the category's stable identity, unaffected by filters.
  // `bannerVideo` is the newest video in the category (filter-independent),
  // so the banner artwork matches the poster the user clicked to get here.
  // `filteredCount` is shown near the grid ONLY when filters narrow the
  // set, so the banner's count never lies but the filtered total is still
  // visible.
  const [categoryCount, channels, languages, videos] = await Promise.all([
    getVideoCount({ category }),
    getChannelsInCategory(category),
    getLanguagesInCategory(category),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
  ]);
  const filteredCount = hasActiveFilters ? await getVideoCount(filters) : categoryCount;

  if (categoryCount === 0) {
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{category}</h1>
        <EmptyState message={tEmpty("default")} />
      </Container>
    );
  }

  return (
    <Container className="page-top pb-10">
      <CategoryBanner category={category} count={categoryCount} subtitle={categorySubtitle(category)} />

      {(channels.length > 0 || languages.length > 0) && (
        <div className="mt-6">
          <FilterChips
            category={category}
            channels={channels}
            languages={languages}
            activeChannelId={channelId}
            activeDuration={duration}
            activeLanguage={language}
            activeSort={sort}
          />
        </div>
      )}

      {hasActiveFilters && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>
            Showing {filteredCount} of {categoryCount} video{categoryCount === 1 ? "" : "s"}
          </span>
          <Link
            href={`/browse/${encodeURIComponent(category)}`}
            className="text-text-muted underline-offset-4 transition-colors hover:text-flame hover:underline"
          >
            {tFilters("clearAll")}
          </Link>
        </p>
      )}

      <div className="mt-8">
        {/* `key` forces a remount (and fresh state) whenever the filters
            change, since VideoGrid otherwise only reads `initialVideos` on
            first mount. */}
        <VideoGrid
          key={`${channelId ?? "all"}-${duration ?? "all"}-${language ?? "all"}-${sort}`}
          initialVideos={videos}
          filters={filters}
        />
      </div>
    </Container>
  );
}
