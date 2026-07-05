import type { Metadata } from "next";

import { BrowseShelf } from "@/components/browse-shelf";
import { CategoryRow } from "@/components/category-row";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { FadeUp } from "@/components/fade-up";
import { HeroCarousel } from "@/components/hero-carousel";
import { PromoBand } from "@/components/promo-band";
import { TopTenRow } from "@/components/top-ten-row";
import {
  getCategoriesByRecency,
  getFeaturedVideos,
  getLatestVideos,
  getPopularVideos,
  getVideosByCategory,
  getVideosPage,
} from "@/lib/data";
import { TOPICS } from "@/lib/topics";

// Without this, Next.js bakes the page once at build time and it never
// updates. `revalidate` = ISR: serve the cached page, rebuild it in the
// background at most every 30 minutes, so the 6-hour sync's new videos appear.
export const revalidate = 1800;

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Home is a server component: `async function` here means "fetch on the
// server, send finished HTML to the browser" - there's no client-side
// loading state to write for this page.
export default async function HomePage() {
  const [featured, latest, categories, radharani, popular] = await Promise.all([
    getFeaturedVideos(10),
    getLatestVideos(10),
    getCategoriesByRecency(),
    getVideosPage({ titleKeywords: TOPICS.radharani.keywords }, 0, 12),
    getPopularVideos(12),
  ]);

  if (latest.length === 0 && categories.length === 0) {
    return (
      <Container>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  // Fetch each row's videos in parallel rather than one category at a time.
  const rows = await Promise.all(
    categories.map(async (category) => ({
      category,
      videos: await getVideosByCategory(category, 10),
    }))
  );

  // Each browse poster shows its category's newest thumbnail (DESIGN.md
  // #4.4). The rows above are already sorted newest-first, so the first
  // video with artwork is the poster - no extra query needed.
  const posterThumbnails = Object.fromEntries(
    rows.map(({ category, videos }) => [
      category,
      videos.find((video) => video.thumbnail_url)?.thumbnail_url ?? null,
    ])
  );

  function categoryRow({ category, videos }: { category: string; videos: typeof rows[number]["videos"] }) {
    return (
      <FadeUp key={category}>
        <CategoryRow category={category} videos={videos} />
      </FadeUp>
    );
  }

  // Row order per DESIGN.md #4.7: Featured (if any) first, then Top 10
  // right after the hero, then category shelves by recency, with the browse
  // shelf slotted after the 2nd category shelf and the promo band after the
  // 3rd. `rows.slice` on a short array just returns fewer/no items, so this
  // reads fine even with 0-3 categories. The Featured shelf is spread in
  // only when videos are flagged, so it's invisible until the owner curates.
  const sections = [
    ...(featured.length > 0
      ? [
          <FadeUp key="featured">
            <CategoryRow title="Featured" videos={featured} />
          </FadeUp>,
        ]
      : []),
    <FadeUp key="top-ten">
      <TopTenRow videos={latest.slice(0, 10)} />
    </FadeUp>,
    // The Śrī Rādhārāṇī topic collection - shown high on the page, links to
    // its full /topic/radharani grid. Spread in only when it has videos.
    ...(radharani.length > 0
      ? [
          <FadeUp key="radharani">
            <CategoryRow
              title={TOPICS.radharani.title}
              href={`/topic/${TOPICS.radharani.slug}`}
              videos={radharani}
            />
          </FadeUp>,
        ]
      : []),
    // "Most Watched" (DESIGN.md discovery): the top videos by YouTube view
    // count, once the worker has enriched view_count. Spread in only when
    // populated so it's invisible on a fresh/empty DB.
    ...(popular.length > 0
      ? [
          <FadeUp key="most-watched">
            <CategoryRow title="Most Watched" videos={popular} />
          </FadeUp>,
        ]
      : []),
    ...rows.slice(0, 2).map(categoryRow),
    <FadeUp key="browse-shelf">
      <BrowseShelf categories={categories} thumbnails={posterThumbnails} />
    </FadeUp>,
    ...rows.slice(2, 3).map(categoryRow),
    <FadeUp key="promo-band">
      <PromoBand />
    </FadeUp>,
    ...rows.slice(3).map(categoryRow),
  ];

  return (
    // `flow-root` gives this wrapper its own block-formatting context, so
    // the Hero's negative top margin (see components/hero-carousel.tsx)
    // doesn't collapse through this div into `<main>`/`<body>` and shift the
    // whole page - only the hero itself moves up, under the top bar.
    <div className="flow-root">
      {latest.length > 0 && <HeroCarousel videos={latest.slice(0, 5)} />}
      <Container className="flex flex-col gap-10 py-10">{sections}</Container>
    </div>
  );
}
