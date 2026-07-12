import type { Metadata } from "next";

import { CategoryCards } from "@/components/category-cards";
import { CategoryRow } from "@/components/category-row";
import { ContinueWatchingShelf } from "@/components/continue-watching-shelf";
import { EmptyState } from "@/components/empty-state";
import { FadeUp } from "@/components/fade-up";
import { Hero, type HeroFeature } from "@/components/hero";
import { LiveStrip } from "@/components/live-strip";
import { QuoteBlock } from "@/components/quote-block";
import { SplitFeature } from "@/components/split-feature";
import { categorySubtitle } from "@/lib/category-meta";
import {
  getAllCategories,
  getFeaturedVideos,
  getLatestVideos,
  getLiveVideos,
  getPopularVideos,
  getVideosPage,
} from "@/lib/data";
import { cleanTitle } from "@/lib/format";
import { getActiveFestivalTopic, TOPIC_LIST } from "@/lib/topics";
import type { Video } from "@/lib/types";

// Without this, Next.js bakes the page once at build time and it never
// updates. `revalidate` = ISR: serve the cached page, rebuild it in the
// background at most every 30 minutes, so the 6-hour sync's new videos appear.
export const revalidate = 1800;

export const metadata: Metadata = { alternates: { canonical: "/" } };

// The rotating hero wants a light, serializable shape, not a whole Video row.
function toHeroFeature(video: Video): HeroFeature {
  return {
    videoId: video.youtube_video_id,
    title: cleanTitle(video.title),
    channel: video.channel?.title ?? null,
    subtitle: categorySubtitle(video.category) ?? null,
  };
}

// Home is a server component: fetch on the server, send finished HTML.
// Section order follows the prototype (goloka-final.html): hero → live
// strip → new arrivals row → topic split → quote → topic rows → category
// cards → most watched. Continue Watching (browser-only personalization)
// and the festival shelf (owner decision 2026-07-05) are kept from the
// previous design and slotted where they don't break the rhythm.
export default async function HomePage() {
  const homeTopics = TOPIC_LIST.filter((topic) => topic.showOnHomepage);
  const activeFestival = getActiveFestivalTopic();

  const [featured, latest, live, categories, topicRows, popular, festivalVideos] =
    await Promise.all([
      getFeaturedVideos(3),
      getLatestVideos(12),
      getLiveVideos(3),
      getAllCategories(),
      Promise.all(
        homeTopics.map(async (topic) => ({
          topic,
          videos: await getVideosPage({ topicSlug: topic.slug }, 0, 8),
        }))
      ),
      getPopularVideos(8),
      activeFestival
        ? getVideosPage({ topicSlug: activeFestival.slug }, 0, 8)
        : Promise.resolve([]),
    ]);

  if (latest.length === 0 && categories.length === 0) {
    return (
      <div className="page-top gutter">
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </div>
    );
  }

  // The hero rotates the owner's hand-curated Featured videos; before any
  // are flagged it falls back to the newest uploads, so it never sits empty.
  const heroFeatures = (featured.length > 0 ? featured : latest).slice(0, 3).map(toHeroFeature);

  // The first home topic with enough videos becomes the feature-split
  // layout; the remaining topics render as ordinary rows.
  const splitIndex = topicRows.findIndex(({ videos }) => videos.length >= 4);
  const splitTopic = splitIndex >= 0 ? topicRows[splitIndex] : null;
  const rowTopics = topicRows.filter(
    (entry, index) => index !== splitIndex && entry.videos.length > 0
  );

  return (
    <div>
      {heroFeatures.length > 0 && <Hero features={heroFeatures} />}

      <FadeUp>
        <LiveStrip videos={live} />
      </FadeUp>

      {/* Client-side personalization: renders null for first-time visitors. */}
      <ContinueWatchingShelf />

      <FadeUp>
        <CategoryRow
          kicker="Fresh from the temples"
          title="Arrived today"
          href="/browse"
          videos={latest.slice(0, 8)}
        />
      </FadeUp>

      {activeFestival && festivalVideos.length > 0 && (
        <FadeUp>
          <CategoryRow
            kicker="Festival days"
            title={activeFestival.title}
            href={`/topic/${activeFestival.slug}`}
            videos={festivalVideos}
          />
        </FadeUp>
      )}

      {splitTopic && (
        <FadeUp>
          <SplitFeature
            kicker="Topic"
            title={splitTopic.topic.title}
            href={`/topic/${splitTopic.topic.slug}`}
            videos={splitTopic.videos}
          />
        </FadeUp>
      )}

      <FadeUp>
        <QuoteBlock />
      </FadeUp>

      {rowTopics.map(({ topic, videos }) => (
        <FadeUp key={topic.slug}>
          <CategoryRow kicker="Topic" title={topic.title} href={`/topic/${topic.slug}`} videos={videos} />
        </FadeUp>
      ))}

      <FadeUp>
        <CategoryCards categories={categories} />
      </FadeUp>

      {popular.length > 0 && (
        <FadeUp>
          <CategoryRow kicker="Beloved by millions" title="Most watched" videos={popular} />
        </FadeUp>
      )}
    </div>
  );
}
