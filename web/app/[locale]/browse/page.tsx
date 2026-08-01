import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CATEGORY_BLURBS, CATEGORY_ICONS, OM_ICON } from "@/components/category-cards";
import { CategoryRow } from "@/components/category-row";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { FadeUp } from "@/components/fade-up";
import { Link } from "@/i18n/navigation";
import { getAllCategories, getLatestVideos, getVideoCount } from "@/lib/data";
import { TOPIC_LIST } from "@/lib/topics";
import { localizedAlternates } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Browse",
    description: "Browse ISKCON lectures, kirtans, festivals, and more by category on Goloka.",
    alternates: localizedAlternates(locale, "/browse"),
  };
}

// Re-generate at most every 30 minutes so new categories/counts appear
// without a redeploy (same reasoning as the home page).
export const revalidate = 1800;

// The gold line-icon category cards (the home page's design language), not
// video-thumbnail posters: the poster grid used each category's NEWEST
// thumbnail, which meant random YouTube title-card collages fronting whole
// categories - a hospital slide fronting "Prasadam & Cooking" on the day
// this was rewritten (owner feedback 2026-07-18). Icons are ours, stable,
// and on-brand; the count line gives the card its factual weight. Category
// list is never hardcoded - it's `select distinct category` via lib/data.ts.
// Category names/blurbs/counts are DB-driven content and stay in English in
// every locale (i18n plan goal #4 - a known limitation, alongside category
// names elsewhere in the app).
export default async function BrowsePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.browse");
  const tEmpty = await getTranslations("emptyState");
  const categories = await getAllCategories();

  if (categories.length === 0) {
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl text-text">{t("h1")}</h1>
        <EmptyState message={tEmpty("default")} />
      </Container>
    );
  }

  // One COUNT per category, plus two bounded shelves - all in parallel, all
  // through lib/data.ts, and the page stays static with revalidate=1800.
  const [counts, topicCounts, latest] = await Promise.all([
    Promise.all(categories.map((category) => getVideoCount({ category }))),
    // One bounded count per registry topic - the same pattern the channel page
    // already uses (channel/[handle]/page.tsx:74), and this page is static
    // with revalidate=1800, so all of it runs once per regeneration rather
    // than once per visit.
    Promise.all(TOPIC_LIST.map((topic) => getVideoCount({ topicSlug: topic.slug }))),
    getLatestVideos(8),
  ]);

  return (
    <Container className="page-top pb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="font-heading text-3xl text-text sm:text-4xl">{t("h1")}</h1>
        <Link href="/leaders" className="text-sm text-text-muted transition-colors hover:text-flame">
          {t("byLeader")}
        </Link>
      </div>

      <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        {categories.map((category, index) => (
          <Link key={category} href={`/browse/${encodeURIComponent(category)}`} className="cat">
            <span className="icon">{CATEGORY_ICONS[category] ?? OM_ICON}</span>
            <h2 className="font-heading text-[19px] [overflow-wrap:break-word]">{category}</h2>
            <p>{CATEGORY_BLURBS[category] ?? "Talks, teachings and more"}</p>
            <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-accent">
              {counts[index]} video{counts[index] === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>

      {/* BY THEME. The reason this page existed as a seven-word menu is that
          categories answer "what IS this" - lecture, kirtan, festival - while
          a devotee arrives asking what a video is ABOUT. Ten topic collections
          already answer that (tag-driven, LLM-judged aboutness rather than
          substring luck), and /topic/gita alone holds over a thousand videos -
          but they were linked from NO navigation surface: not the header, not
          the More sheet, not the tab bar, not the footer. Meanwhile every
          topic page renders <Breadcrumb href="/browse">, declaring this page
          as its parent. A devotee who opened a shared /topic link and tapped
          "← Browse" to find more like it was actively misdirected.
          Same .cat language as the categories above, deliberately: this is a
          second way in, not a louder one. */}
      <section className="mt-14">
        <h2 className="font-heading text-2xl text-text sm:text-3xl">{t("byTheme")}</h2>
        <p className="mt-2 max-w-measure text-[15px] leading-relaxed text-text-muted">
          {t("byThemeBlurb")}
        </p>
        <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {TOPIC_LIST.map((topic, index) => (
            <Link key={topic.slug} href={`/topic/${topic.slug}`} className="cat">
              {/* The om glyph for every theme rather than ten new drawings -
                  DESIGN.md §9: structure, not ornament. */}
              <span className="icon">{OM_ICON}</span>
              <h3 className="font-heading text-[19px] [overflow-wrap:break-word]">{topic.title}</h3>
              <p>{topic.subtitle}</p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-accent">
                {topicCounts[index]} video{topicCounts[index] === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ONE row of real videos, not two. Home already owns arrivals AND
          most-watched; repeating both here is the streaming-service drift §9
          forbids. This exists so the page is not a menu, and so home's
          "Arrived today → View all" lands somewhere that actually has videos.
          Rows, not posters: 4d29b81 (owner, 2026-07-18) deleted the poster
          grid because ONE arbitrary newest thumbnail stood for a whole
          category. In a row each thumbnail represents itself and carries its
          own title - the language home already uses. */}
      <div className="mt-14">
        <FadeUp>
          <CategoryRow kicker={t("kicker")} title={t("newest")} videos={latest} />
        </FadeUp>
      </div>
    </Container>
  );
}
