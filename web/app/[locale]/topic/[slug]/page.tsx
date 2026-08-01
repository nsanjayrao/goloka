import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/breadcrumb";
import { Link } from "@/i18n/navigation";
import { CategoryBanner } from "@/components/category-banner";
import { FilterChips } from "@/components/filter-chips";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { ShareButton, WhatsAppShareButton } from "@/components/share-button";
import { VideoGrid } from "@/components/video-grid";
import {
  CATEGORY_PAGE_SIZE,
  getChannelsIn,
  getLanguagesIn,
  getVideoCount,
  getVideosPage,
} from "@/lib/data";
import type { DurationBucket } from "@/lib/types";
import { localizedAlternates } from "@/lib/site";
import { TOPIC_LIST, TOPICS } from "@/lib/topics";

// DYNAMIC as of 2026-08-01, and that is a deliberate trade worth stating.
// This page was static with revalidate=1800. Reading searchParams for the
// filter chips forces per-request rendering, so 9 topics x 5 locales stop
// being pre-rendered and each view costs 4 bounded queries instead of 0.
//
// It is worth it because the page was a wall: /topic/ekadashi is 278 videos,
// newest-first, no controls at all - and measured, 18 of the first 20 came
// from a single channel and 16 were titled in Devanagari, so a devotee who
// does not read Hindi arrived at "Ekādaśī" and saw what looked like a Hindi
// channel. Filters are the difference between a collection and a heap.
// If the query cost ever bites, the cheap reversal is to drop the chips here
// and restore `export const revalidate` - nothing else depends on this.
type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ channel?: string; duration?: string; language?: string; sort?: string }>;
};

// Pre-renders one page per registry entry (crossed with every locale from
// app/[locale]/layout.tsx's own generateStaticParams - Next.js combines
// sibling dynamic segments' generateStaticParams automatically); any other
// slug 404s via notFound() below rather than rendering an empty "topic"
// page for a typo'd URL.
export function generateStaticParams() {
  return TOPIC_LIST.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const topic = TOPICS[slug];
  if (!topic) return {};
  return {
    title: topic.title,
    description: topic.subtitle,
    alternates: localizedAlternates(locale, `/topic/${topic.slug}`),
  };
}

export default async function TopicPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("library");
  const tEmpty = await getTranslations("emptyState");
  const tNav = await getTranslations("nav");
  const tFilters = await getTranslations("filterChips");
  const topic = TOPICS[slug];
  if (!topic) notFound();

  // Tag-driven (2026-07-13): the sync worker LLM-judges what each video is
  // PRIMARILY about and writes topic slugs into `tags` - so this page shows
  // videos about the topic, not videos whose title happens to contain a
  // substring ("aradhana" is not Radharani content).
  // The chips narrow the SAME filter object the grid and the count use, so
  // the heading, the results and "load more" can never disagree.
  const channelId = Number(sp.channel) || undefined;
  const duration = (["short", "medium", "long"] as const).includes(sp.duration as DurationBucket)
    ? (sp.duration as DurationBucket)
    : undefined;
  const sort = sp.sort === "popular" ? ("popular" as const) : ("recent" as const);
  const filters = {
    topicSlug: topic.slug,
    ...(channelId ? { channelId } : {}),
    ...(duration ? { duration } : {}),
    ...(sp.language ? { language: sp.language } : {}),
    ...(sort === "popular" ? { sort } : {}),
  };

  // The chip LISTS are scoped to the whole topic, never to the current
  // narrowing - otherwise choosing a teacher would delete every other teacher
  // from the menu and strand the devotee there.
  const scope = { topicSlug: topic.slug };
  const [count, videos, channels, languages] = await Promise.all([
    getVideoCount(filters),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
    getChannelsIn(scope),
    getLanguagesIn(scope),
  ]);

  if (count === 0) {
    // With filters this now means "nothing matches THIS narrowing", not "the
    // topic is empty" - so offer the way back out rather than a dead end.
    const narrowed = Boolean(channelId || duration || sp.language);
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{topic.title}</h1>
        <EmptyState message={narrowed ? tEmpty("noFilterMatch") : tEmpty("default")} />
        {narrowed && (
          <p className="mt-4 text-center">
            <Link href={`/topic/${topic.slug}`} className="text-accent hover:text-flame">
              {tFilters("clearAll")}
            </Link>
          </p>
        )}
      </Container>
    );
  }

  return (
    <Container className="page-top pb-10">
      <div className="mb-5">
        <Breadcrumb href="/browse" label={tNav("browse")} />
      </div>
      <CategoryBanner category={topic.title} count={count} subtitle={topic.subtitle} />

      {/* Topic pages are a saved search devotees pass around - give the
          collection its own share row rather than relying on the browser
          address bar. */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-text-muted">
        <span>{t("shareCollection")}</span>
        <WhatsAppShareButton title={topic.title} path={`/topic/${topic.slug}`} />
        <ShareButton title={topic.title} path={`/topic/${topic.slug}`} />
      </div>

      <div className="mt-8">
        <FilterChips
          basePath={`/topic/${topic.slug}`}
          channels={channels}
          languages={languages}
          activeChannelId={channelId}
          activeDuration={duration}
          activeLanguage={sp.language}
          activeSort={sort}
        />
      </div>

      <div className="mt-8">
        <VideoGrid initialVideos={videos} filters={filters} />
      </div>
    </Container>
  );
}
