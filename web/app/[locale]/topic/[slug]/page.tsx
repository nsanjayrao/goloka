import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CategoryBanner } from "@/components/category-banner";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { ShareButton, WhatsAppShareButton } from "@/components/share-button";
import { VideoGrid } from "@/components/video-grid";
import { CATEGORY_PAGE_SIZE, getVideoCount, getVideosPage } from "@/lib/data";
import { localizedAlternates } from "@/lib/site";
import { TOPIC_LIST, TOPICS } from "@/lib/topics";

// Static + ISR like `/` and `/browse`: each topic is a fixed saved search (no
// per-request params beyond the slug), so it's served cached and rebuilt at
// most every 30 min to pick up newly synced videos. "Load more" is still live
// (VideoGrid fetches further pages client-side).
export const revalidate = 1800;

type Props = { params: Promise<{ locale: string; slug: string }> };

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

export default async function TopicPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("library");
  const tEmpty = await getTranslations("emptyState");
  const topic = TOPICS[slug];
  if (!topic) notFound();

  // Tag-driven (2026-07-13): the sync worker LLM-judges what each video is
  // PRIMARILY about and writes topic slugs into `tags` - so this page shows
  // videos about the topic, not videos whose title happens to contain a
  // substring ("aradhana" is not Radharani content).
  const filters = { topicSlug: topic.slug };

  const [count, videos] = await Promise.all([
    getVideoCount(filters),
    getVideosPage(filters, 0, CATEGORY_PAGE_SIZE),
  ]);

  if (count === 0) {
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{topic.title}</h1>
        <EmptyState message={tEmpty("default")} />
      </Container>
    );
  }

  return (
    <Container className="page-top pb-10">
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
        <VideoGrid initialVideos={videos} filters={filters} />
      </div>
    </Container>
  );
}
