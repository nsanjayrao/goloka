import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CategoryBanner } from "@/components/category-banner";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { ShareButton, WhatsAppShareButton } from "@/components/share-button";
import { VideoCard } from "@/components/video-card";
import { getSharedCollection } from "@/lib/data";

// A devotee turns a saved list into ONE link ("Ekadasi lectures for Ma")
// that opens for anyone, signed in or not - this is that public page.
// Dynamic (looked up per-request by its slug, like /watch/[id]), but ISR'd:
// a shared collection is an immutable snapshot (db/schema.sql has no UPDATE
// policy on shared_collections), so an hour-old cache is never stale.
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

// React.cache dedupes within one request: generateMetadata and the page
// component both look the collection up, but only one Supabase round trip
// (well, two - collection then videos) runs.
const getCollection = cache(getSharedCollection);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) return { title: "Shared collection" };

  const count = collection.videos.length;
  return {
    title: collection.title,
    description: `A collection of ${count} devotional video${count === 1 ? "" : "s"}.`,
    // The default lotus OG card (app/opengraph-image.tsx) is fine here - no
    // per-collection artwork to show, same as /topic/[slug].
    alternates: { canonical: `/c/${id}` },
  };
}

const GRID_CLASSES =
  "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export default async function SharedCollectionPage({ params }: Props) {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) notFound();

  const { title, videos } = collection;

  return (
    <Container className="page-top pb-10">
      <CategoryBanner category={title} count={videos.length} subtitle="A shared collection from Goloka." />

      {/* Same share row idiom as /topic/[slug] - a collection devotees pass
          around deserves its own share affordance, not just the address bar. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-text-muted">
        <span>Share this collection</span>
        <WhatsAppShareButton title={title} path={`/c/${id}`} />
        <ShareButton title={title} path={`/c/${id}`} />
      </div>

      <div className="mt-8">
        {videos.length === 0 ? (
          // Defensive: every video this collection pointed to has since been
          // pruned from the catalog. The collection itself still exists and
          // the page still renders - just nothing to show.
          <EmptyState message="These videos are no longer available — the devotee who shared this list, or the videos themselves, may have moved on." />
        ) : (
          <div className={GRID_CLASSES}>
            {videos.map((video) => (
              <VideoCard key={video.youtube_video_id} video={video} />
            ))}
          </div>
        )}
      </div>

      <p className="mt-12 text-center text-[13px] text-text-muted">
        Shared from Goloka — a free index of ISKCON lectures, kirtans and festivals.
      </p>
    </Container>
  );
}
