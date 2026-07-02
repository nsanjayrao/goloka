import type { Metadata } from "next";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { FilterChips } from "@/components/filter-chips";
import { VideoGrid } from "@/components/video-grid";
import {
  CATEGORY_PAGE_SIZE,
  getChannelsInCategory,
  getVideoCount,
  getVideosPage,
} from "@/lib/data";
import type { DurationBucket } from "@/lib/types";

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
  return { title: decodeURIComponent(category) };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: rawCategory } = await params;
  const category = decodeURIComponent(rawCategory);
  const query = await searchParams;

  const channelId = query.channel ? Number(query.channel) : undefined;
  const duration = DURATION_VALUES.includes(query.duration as DurationBucket)
    ? (query.duration as DurationBucket)
    : undefined;

  const filters = { category, channelId, duration };
  const hasActiveFilters = channelId !== undefined || duration !== undefined;

  // `categoryCount` decides whether the category itself exists/has any
  // content at all (the full-page empty state below). `filteredCount` is
  // what the heading shows - it needs its own query when filters are
  // active, otherwise the heading would claim e.g. "42 videos" while a
  // channel+duration combo that matches zero videos shows an empty grid.
  const [categoryCount, channels, videos] = await Promise.all([
    getVideoCount({ category }),
    getChannelsInCategory(category),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{category}</h1>
        <span className="text-sm text-text-muted">
          {filteredCount} video{filteredCount === 1 ? "" : "s"}
        </span>
      </div>

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

      <div className="mt-8">
        {/* `key` forces a remount (and fresh state) whenever the filters
            change, since VideoGrid otherwise only reads `initialVideos` on
            first mount. */}
        <VideoGrid key={`${channelId ?? "all"}-${duration ?? "all"}`} initialVideos={videos} filters={filters} />
      </div>
    </Container>
  );
}
