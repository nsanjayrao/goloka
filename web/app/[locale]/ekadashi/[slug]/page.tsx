import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CategoryRow } from "@/components/category-row";
import { Container } from "@/components/container";
import { Ornament } from "@/components/ornament";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  allStories,
  desireTreeUrl,
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
// and /books already use. The title is the ekādaśī's name and nothing more -
// it used to read "<name> - the story", which promised a telling this page
// deliberately does not give.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const story = storyForSlug(slug);
  if (!story) return {};
  const plain = story.name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return {
    title: plain,
    description: `${plain} — when it falls, the Purāṇa its glories are recorded in, and classes about it.`,
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
      {/* `page-top`, not a py- utility. Every other inner page in the app uses
          this token because it is what clears the FIXED header
          (clamp(88px,12vh,120px) vs the header's 64-72px). This page shipped
          with `py-10` and its back link rendered at y~68, half-hidden behind
          the header on every load. Do not swap it back for a padding class. */}
      <Container className="page-top pb-10 sm:pb-14">
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

        <a
          href={desireTreeUrl(story)}
          target="_blank"
          rel="noopener noreferrer"
          className="mahatmya-link"
        >
          <span className="kicker">{t("kicker")}</span>
          <span className="title">{t("readFullTitle", { name: story.name })}</span>
          <span className="note">{t("readFullNote", { purana: story.purana })}</span>
        </a>
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

      {/* Attribution. The outbound link lives in the card above rather than
          here now - repeating it in the footer would bury the one thing on
          this page that leads to the actual scripture. */}
      <Container className="pb-14 sm:pb-20">
        <footer className="mt-14 border-t border-border pt-6 sm:mt-20">
          <p className="max-w-measure text-[13px] leading-relaxed text-text-muted">
            {t("sourceNote", { purana: story.purana })}
          </p>
        </footer>
      </Container>
    </>
  );
}
