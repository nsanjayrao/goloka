import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryBanner } from "@/components/category-banner";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { VideoGrid } from "@/components/video-grid";
import { CATEGORY_PAGE_SIZE, getVideoCount, getVideosPage } from "@/lib/data";
import { TOPIC_LIST, TOPICS } from "@/lib/topics";

// Static + ISR like `/` and `/browse`: each topic is a fixed saved search (no
// per-request params beyond the slug), so it's served cached and rebuilt at
// most every 30 min to pick up newly synced videos. "Load more" is still live
// (VideoGrid fetches further pages client-side).
export const revalidate = 1800;

type Props = { params: Promise<{ slug: string }> };

// Pre-renders one page per registry entry; any other slug 404s via notFound()
// below rather than rendering an empty "topic" page for a typo'd URL.
export function generateStaticParams() {
  return TOPIC_LIST.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = TOPICS[slug];
  if (!topic) return {};
  return {
    title: topic.title,
    description: topic.subtitle,
    alternates: { canonical: `/topic/${topic.slug}` },
  };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const topic = TOPICS[slug];
  if (!topic) notFound();

  // Only the title keywords - no category/channel/duration - so this gathers
  // every matching video across the whole catalog.
  const filters = { titleKeywords: topic.keywords };

  const [count, videos, bannerVideos] = await Promise.all([
    getVideoCount(filters),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
    getVideosPage(filters, 0, 1), // newest match -> banner artwork
  ]);

  if (count === 0) {
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{topic.title}</h1>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  return (
    <Container className="page-top pb-10">
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
