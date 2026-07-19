import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CalendarStrip } from "@/components/calendar-strip";
import { CategoryCards } from "@/components/category-cards";
import { CategoryRow } from "@/components/category-row";
import { ContinueWatchingShelf } from "@/components/continue-watching-shelf";
import { EmptyState } from "@/components/empty-state";
import { FadeUp } from "@/components/fade-up";
import { Hero, type HeroFeature } from "@/components/hero";
import { LanguageShelf } from "@/components/language-shelf";
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
import { localizedAlternates } from "@/lib/site";
import { getActiveFestivalTopic, TOPIC_LIST } from "@/lib/topics";
import type { Video } from "@/lib/types";

// Without this, Next.js bakes the page once at build time and it never
// updates. `revalidate` = ISR: serve the cached page, rebuild it in the
// background at most every 10 minutes - tightened from 30 (2026-07-18) so
// the "Live from the dhāma" strip tracks the 15-minute live check instead
// of showing streams that ended half an hour ago. ISR survives per-locale
// (i18n plan goal #2): generateStaticParams in app/[locale]/layout.tsx
// pre-renders one static page per locale, each on this same revalidate
// window.
export const revalidate = 600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localizedAlternates(locale) };
}

// Priming the static-rendering flag for THIS segment, not just the parent
// layout, is what keeps `/`, `/hi`, `/bn`, `/ru`, `/es` (and every other
// locale page below) statically generated per locale instead of falling
// back to per-request dynamic rendering the moment a Server Component in
// this segment calls getTranslations() (i18n plan goal #2 - a next-intl
// App Router gotcha: setRequestLocale must be called in both the layout
// AND each page).

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
// cards → most watched. Continue Watching, the language picker/shelf, and
// the festival shelf (browser-only personalization, owner decision
// 2026-07-05 for the festival shelf) are kept from the previous design and
// slotted where they don't break the rhythm.
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tEmpty = await getTranslations("emptyState");
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
        <EmptyState message={tEmpty("default")} />
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

      <FadeUp>
        <CalendarStrip />
      </FadeUp>

      {/* Client-side personalization: renders null for first-time visitors. */}
      <ContinueWatchingShelf />

      {/* Client-side personalization: the picker always renders, the shelf
          above it only once a language preference is set and has videos. */}
      <LanguageShelf />

      <FadeUp>
        <CategoryRow
          kicker={t("freshFromTheTemples")}
          title={t("arrivedToday")}
          href="/browse"
          videos={latest.slice(0, 8)}
        />
      </FadeUp>

      {activeFestival && festivalVideos.length > 0 && (
        <FadeUp>
          <CategoryRow
            kicker={t("festivalDays")}
            title={activeFestival.title}
            href={`/topic/${activeFestival.slug}`}
            videos={festivalVideos}
          />
        </FadeUp>
      )}

      {splitTopic && (
        <FadeUp>
          <SplitFeature
            kicker={t("topic")}
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
          <CategoryRow kicker={t("topic")} title={topic.title} href={`/topic/${topic.slug}`} videos={videos} />
        </FadeUp>
      ))}

      <FadeUp>
        <CategoryCards categories={categories} />
      </FadeUp>

      {popular.length > 0 && (
        <FadeUp>
          <CategoryRow kicker={t("belovedByMillions")} title={t("mostWatched")} videos={popular} />
        </FadeUp>
      )}
    </div>
  );
}
