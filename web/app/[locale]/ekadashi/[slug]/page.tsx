import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CategoryRow } from "@/components/category-row";
import { ComicStrip } from "@/components/comic-strip";
import { Container } from "@/components/container";
import { Ornament } from "@/components/ornament";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  allStories,
  desireTreeSearchUrl,
  storyForSlug,
  titleKeywordsFor,
} from "@/lib/ekadashi-stories";
import { getVideosPage } from "@/lib/data";
import { localizedAlternates } from "@/lib/site";
import { EKADASHIS, ekadashiSlug, toISTDateString } from "@/lib/vaishnava-calendar";

// Static: 24 stories x 6 locales, all known at build time, so this costs
// nothing per request. Same ISR window as /calendar - the only thing on the
// page that ages is the "next observed" date.
export const revalidate = 21600;

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    allStories().map((story) => ({ locale, slug: story.slug }))
  );
}

// Fixed English title/description, the same convention /calendar, /leaders
// and /books already use - story bodies are English-first (DESIGN.md §6).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = storyForSlug(slug);
  if (!story) return {};
  const plain = story.name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return {
    title: `${plain} - the story`,
    description: story.summary,
    alternates: localizedAlternates(locale, `/ekadashi/${slug}`),
  };
}

/** The next date this ekādaśī falls on, from the registry. Null once the
 * registry runs out (past 2027) - the page still renders the story, which is
 * the part that does not expire. */
function nextOccurrence(slug: string, now: Date): string | null {
  const today = toISTDateString(now);
  return (
    EKADASHIS.find((entry) => ekadashiSlug(entry.name) === slug && entry.date >= today)?.date ?? null
  );
}

export default async function EkadashiStoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const story = storyForSlug(slug);
  if (!story) notFound();

  const t = await getTranslations("ekadashiStory");

  // The shelf is supplementary: getVideosPage is wrapped in safely(), so an
  // unreachable DB renders the story with no shelf rather than failing the
  // page. The story is the point; the classes are the bonus.
  const lectures = await getVideosPage(
    { titleKeywords: titleKeywordsFor(story), sort: "popular" },
    0,
    8
  );

  const nextDate = nextOccurrence(slug, new Date());
  const formattedDate = nextDate
    ? new Date(`${nextDate}T00:00:00Z`).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <>
      <Container className="py-10 sm:py-14">
      <nav className="mb-6">
        <Link
          href="/calendar"
          className="text-[13px] text-text-muted underline-offset-4 hover:text-text hover:underline"
        >
          {t("backToCalendar")}
        </Link>
      </nav>

      <header className="max-w-measure">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">{t("kicker")}</p>
        <h1 className="mt-2 font-heading text-[30px] leading-tight sm:text-[40px]">{story.name}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-text-muted">{story.summary}</p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-[13px]">
          <div>
            <dt className="text-text-muted">{t("occasion")}</dt>
            <dd className="mt-0.5">{story.occasion}</dd>
          </div>
          <div>
            <dt className="text-text-muted">{t("toldIn")}</dt>
            <dd className="mt-0.5">{story.purana}</dd>
          </div>
          {formattedDate && (
            <div>
              <dt className="text-text-muted">{t("nextObserved")}</dt>
              <dd className="mt-0.5">{formattedDate}</dd>
            </div>
          )}
        </dl>
      </header>

      <Ornament className="my-9 sm:my-12" />

        <ComicStrip slug={story.slug} panels={story.panels} storyName={story.name} />
      </Container>

      {/* Outside Container: CategoryRow carries its own --pad gutters, the
          same reason the watch page mounts it outside (see its comment).
          No `category`/`href`, so it renders no "View all" - sending a
          devotee from a specific story back to the undifferentiated
          /topic/ekadashi pile is the exact problem this page exists to fix. */}
      {lectures.length > 0 && (
        <CategoryRow
          kicker={t("kicker")}
          title={t("classesTitle", { name: story.name })}
          videos={lectures}
        />
      )}

      {/* Attribution is structural, not a footnote (DESIGN.md §6): the
          retelling above is ours, from a public-domain Purāṇic source, and
          the devotional site that also tells it is credited and linked
          rather than copied. */}
      <Container className="pb-14 sm:pb-20">
        <footer className="mt-14 border-t border-border pt-6 sm:mt-20">
          <p className="max-w-measure text-[13px] leading-relaxed text-text-muted">
            {t("sourceNote", { purana: story.purana })}
          </p>
          <a
            href={desireTreeSearchUrl(story.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[13px] font-medium text-accent-strong underline-offset-4 hover:underline"
          >
            {t("readElsewhere")}
          </a>
        </footer>
      </Container>
    </>
  );
}
