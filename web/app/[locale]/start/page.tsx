import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/container";
import { Thumbnail } from "@/components/thumbnail";
import { Link } from "@/i18n/navigation";
import { getVideoByYoutubeId } from "@/lib/data";
import { cleanTitle } from "@/lib/format";
import { NEWCOMER_PATH, type NewcomerStep } from "@/lib/newcomer-path";
import { localizedAlternates } from "@/lib/site";
import type { Video } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Begin Here",
    description:
      "New to Kṛṣṇa consciousness? Ten short videos, in order, from who Kṛṣṇa is to your first kirtan and beyond.",
    alternates: localizedAlternates(locale, "/start"),
  };
}

// The step order is hand-curated and barely ever changes, but each step's
// video metadata (title, thumbnail, channel) is a live Supabase read - the
// same staleness window as /browse, so a video that's edited or removed
// upstream doesn't stay wrong here for a full redeploy cycle.
export const revalidate = 1800;

const CARD_SIZES = "(min-width: 640px) 240px, 40vw";

// A step's video is fetched fresh from the catalog rather than trusted from
// the hand-written registry - titles/channels/thumbnails can change (or a
// video can be taken down) without anyone touching lib/newcomer-path.ts.
// Step question/why text (NEWCOMER_PATH) is hand-curated English content,
// not UI chrome - left untranslated in this pass, like book/temple copy.
function StepVideo({ video, unavailableText }: { video: Video | null; unavailableText: string }) {
  // Defensive: a video can vanish from YouTube (or the catalog) after this
  // page was curated. Rather than a broken thumbnail or a dead link, the
  // step still reads fine on its own - the question and the "why" carry it.
  if (!video) {
    return <p className="mt-3 text-[13px] text-text-muted/80">{unavailableText}</p>;
  }

  const title = cleanTitle(video.title);

  return (
    <Link
      href={`/watch/${video.youtube_video_id}`}
      className="group mt-4 flex items-center gap-3 rounded-card border border-border bg-bg/40 p-2 transition-colors hover:border-hairline sm:gap-4"
    >
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md sm:w-40">
        {video.thumbnail_url ? (
          <Thumbnail src={video.thumbnail_url} alt={title} sizes={CARD_SIZES} />
        ) : (
          <div className="h-full w-full bg-surface" />
        )}
      </div>
      <div className="min-w-0">
        <p
          className="line-clamp-2 text-[14px] font-medium text-text transition-colors group-hover:text-flame"
          title={title}
        >
          {title}
        </p>
        {video.channel?.title && (
          <p className="mt-1 text-[13px] text-text-muted">{video.channel.title}</p>
        )}
      </div>
    </Link>
  );
}

export default async function StartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.start");
  // One fetch per step, in parallel - ten small lookups, all bounded, all
  // going through the safely()-wrapped getVideoByYoutubeId so an unreachable
  // database still renders the page (every step just falls back to text).
  const videos = await Promise.all(
    NEWCOMER_PATH.map((step) => getVideoByYoutubeId(step.youtube_video_id))
  );

  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl text-text sm:text-4xl">{t("h1")}</h1>
      <p className="mt-2 max-w-2xl text-text-muted">{t("intro")}</p>

      <ol className="mt-10 flex flex-col gap-6">
        {NEWCOMER_PATH.map((step: NewcomerStep, index: number) => (
          <li
            key={step.step}
            className="flex gap-4 rounded-section border border-border bg-gradient-to-br from-surface to-bg p-6 sm:gap-6"
          >
            <span
              className="shrink-0 font-heading text-3xl text-accent sm:text-4xl"
              aria-hidden="true"
            >
              {String(step.step).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-[20px] leading-snug text-text sm:text-[22px]">
                {step.title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-text-muted">{step.why}</p>
              <StepVideo video={videos[index]} unavailableText={t("videoUnavailable")} />
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 max-w-2xl border-t border-border pt-8">
        <h2 className="font-heading text-2xl text-text">{t("whereNextTitle")}</h2>
        <p className="mt-2 text-text-muted">
          {t.rich("whereNextBody", {
            books: (chunks) => (
              <Link href="/books" className="text-accent-strong underline-offset-4 hover:underline">
                {chunks}
              </Link>
            ),
            temples: (chunks) => (
              <Link href="/temples" className="text-accent-strong underline-offset-4 hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </Container>
  );
}
