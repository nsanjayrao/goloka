import type { Metadata } from "next";

import { CategoryBanner } from "@/components/category-banner";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { VideoGrid } from "@/components/video-grid";
import { CATEGORY_PAGE_SIZE, getVideoCount, getVideosPage } from "@/lib/data";
import { TOPICS } from "@/lib/topics";

// Static + ISR like `/` and `/browse`: the collection is a fixed saved search
// (no route params), so we serve it cached and rebuild at most every 30 min to
// pick up newly synced Radha videos. "Load more" is still live (VideoGrid
// fetches further pages client-side).
export const revalidate = 1800;

const topic = TOPICS.radharani;

export const metadata: Metadata = {
  title: topic.title,
  description: topic.subtitle,
  alternates: { canonical: `/topic/${topic.slug}` },
};

export default async function RadharaniTopicPage() {
  // Only the title keywords - no category/channel/duration - so this gathers
  // every Radha-themed video across the whole catalog.
  const filters = { titleKeywords: topic.keywords };

  const [count, videos, bannerVideos] = await Promise.all([
    getVideoCount(filters),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
    getVideosPage(filters, 0, 1), // newest match -> banner artwork
  ]);

  if (count === 0) {
    return (
      <Container className="py-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{topic.title}</h1>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <CategoryBanner
        category={topic.title}
        thumbnail={bannerVideos[0]?.thumbnail_url ?? null}
        count={count}
        subtitle={topic.subtitle}
      />
      <div className="mt-8">
        <VideoGrid initialVideos={videos} filters={filters} />
      </div>
    </Container>
  );
}
