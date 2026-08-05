import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Breadcrumb } from "@/components/breadcrumb";
import { CategoryRow } from "@/components/category-row";
import { Container } from "@/components/container";
import { RecordWatch } from "@/components/record-watch";
import { TempleLamp } from "@/components/temple-lamp";
import { UpNext } from "@/components/up-next";
import { SaveButtons } from "@/components/save-buttons";
import { ShareButton, WhatsAppShareButton } from "@/components/share-button";
import { VideoDescription } from "@/components/video-description";
import { Link } from "@/i18n/navigation";
import { cleanTitle, formatDuration, formatRelativeDate } from "@/lib/format";
import { getMoreFromCategory, getSeriesForVideo, getVideoByYoutubeId } from "@/lib/data";
import { displayPartNumber, watchPageSeriesReversed } from "@/lib/series-order";
import { localizedAlternates } from "@/lib/site";
import type { Video } from "@/lib/types";

// The `[id]` segment is the YouTube video ID, not our internal bigint id
// (see the task spec: "id route param is the youtube_video_id").
type Props = { params: Promise<{ locale: string; id: string }> };

// React.cache dedupes within one request: generateMetadata and the page
// component both look the video up, but only one Supabase query runs.
const getVideo = cache(getVideoByYoutubeId);

// The thumbnail every share/unfurl shows. thumbnail_url from the DB when
// we have it; otherwise YouTube's always-available 480px default.
function shareThumbnail(video: Video): string {
  return video.thumbnail_url ?? `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`;
}

// One-line share description: the description's first sentence-ish chunk,
// newlines flattened (OG descriptions are single-line).
function shareDescription(video: Video): string {
  const flattened = (video.description ?? "").replace(/\s+/g, " ").trim();
  return flattened.slice(0, 160) || "Watch on Goloka — a free index of ISKCON lectures, kirtans, and festivals.";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const video = await getVideo(id);
  if (!video) return { title: "Video" };

  // Open Graph + Twitter card (DESIGN.md "Video page"): with these, a link
  // pasted into WhatsApp/Telegram/X unfurls with the video's artwork and a
  // real description instead of a bare URL.
  const title = cleanTitle(video.title);
  const description = shareDescription(video);
  const images = [shareThumbnail(video)];
  return {
    title,
    description,
    // youtube_video_id is alphanumeric + -/_ , so it's URL-safe as-is.
    alternates: localizedAlternates(locale, `/watch/${id}`),
    openGraph: { title, description, images, type: "video.other" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

/** duration_seconds -> ISO 8601 duration ("PT1H23M45S") for JSON-LD. */
function isoDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${seconds}S`;
}

export default async function WatchPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("watchPage");
  const video = await getVideo(id);
  if (!video) notFound();

  const [moreVideos, series] = await Promise.all([
    getMoreFromCategory(video.category, video.youtube_video_id, 10),
    getSeriesForVideo(video.id),
  ]);
  const title = cleanTitle(video.title);

  // "Up next": the NEXT EPISODE when this video belongs to a series (a
  // series flows in order - that's its whole nature); otherwise from the
  // already-fetched category row - the same channel's video when the row
  // has one, else the row's first. Always legible, no magic ranking.
  const nextVideo =
    series?.next ??
    moreVideos.find((v) => video.channel?.title && v.channel?.title === video.channel.title) ??
    moreVideos[0] ??
    null;
  const upNext = nextVideo
    ? {
        id: nextVideo.youtube_video_id,
        title: cleanTitle(nextVideo.title),
        thumbnailUrl: nextVideo.thumbnail_url,
      }
    : null;

  // schema.org VideoObject (DESIGN.md "Video page"): structured data that
  // lets search engines list this page as a *video* result. It describes
  // the same YouTube embed the page shows - still indexing, never hosting.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description: shareDescription(video),
    thumbnailUrl: shareThumbnail(video),
    ...(video.published_at && { uploadDate: video.published_at }),
    ...(video.duration_seconds != null && { duration: isoDuration(video.duration_seconds) }),
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtube_video_id}`,
  };

  return (
    <>
      <RecordWatch
        youtubeVideoId={video.youtube_video_id}
        title={title}
        thumbnailUrl={video.thumbnail_url}
        channelTitle={video.channel?.title ?? null}
        durationSeconds={video.duration_seconds}
        category={video.category}
      />

      {/* The cinematic stage (DESIGN.md #6 "Watch page"): the player sits
          directly on the midnight canvas with the āratī lamp glowing behind
          it at low intensity, now time-of-day aware (#5.13) - the same lamp
          quality a devotee would find sitting before the actual player at
          that hour. The old light-theme CSS-var override band is gone -
          the page IS dark now. */}
      <div className="relative overflow-hidden">
        <TempleLamp dim />
        <Container className="page-top pb-8 sm:pb-10">
          <div className="mx-auto max-w-4xl">
            {/* Standard, unmodified YouTube embed via youtube-nocookie.com -
                Goloka is an index, never a host (see README). No custom
                controls, no download/proxy of the video itself. LiteEmbed
                (inside UpNext) decides whether to render the iframe
                immediately or a tap-to-load facade, based on the visitor's
                data-saver preference; UpNext adds the opt-in "continue to
                the next video" toggle and end-of-video moment. */}
            {/* One step up (2026-07-23). Most visits to this page arrive from
                a link someone shared, not from browsing - so there was no
                history to go back to and no way into the rest of the app
                except the wordmark.
                ABOVE the player, matching channel/topic/series where it is
                the first thing in the container. It used to sit below UpNext,
                so the same component meant "go up one level" on three pages
                and appeared mid-page on the fourth, 20px from the series bar
                with nothing to distinguish their roles. */}
            {video.category && (
              <div className="mb-5">
                <Breadcrumb
                  href={`/browse/${encodeURIComponent(video.category)}`}
                  label={video.category}
                />
              </div>
            )}

            <UpNext videoId={video.youtube_video_id} title={title} next={upNext} />

            {/* The series bar (2026-07-22): when this video is part of a
                playlist, say so and hand the devotee the whole path - the
                series page, the previous episode, the next. Born of a real
                wound: landing on "episode 10" with no road back to episode 1
                except YouTube itself. */}
            {series && (
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                <span className="text-[11px] uppercase tracking-[0.18em] text-accent">
                  {t("seriesKicker")}
                </span>
                <Link
                  href={`/series/${series.series.youtube_playlist_id}`}
                  className="text-text underline-offset-4 transition-colors hover:text-flame focus-visible:text-flame"
                  aria-label={t("seriesViewAria", { title: series.series.title })}
                >
                  {/* Counted from the FIRST class, not the first playlist
                      slot. A newest-first playlist told a devotee twelve
                      classes in that they were on "Part 76 of 87". The
                      direction is read from the two neighbours this page has
                      already fetched, so it costs no extra query, and it
                      declines to guess when only one neighbour exists. */}
                  {t("seriesPart", {
                    position: displayPartNumber(
                      series.position,
                      series.series.item_count ?? 0,
                      watchPageSeriesReversed(
                        series.prev?.published_at,
                        video.published_at,
                        series.next?.published_at
                      )
                    ),
                    total: series.series.item_count,
                  })}{" "}
                  · {series.series.title}
                </Link>
                {series.prev && (
                  <Link
                    href={`/watch/${series.prev.youtube_video_id}`}
                    className="text-text-muted transition-colors hover:text-flame focus-visible:text-flame"
                  >
                    ← {t("seriesPrev")}
                  </Link>
                )}
                {series.next && (
                  <Link
                    href={`/watch/${series.next.youtube_video_id}`}
                    className="text-text-muted transition-colors hover:text-flame focus-visible:text-flame"
                  >
                    {t("seriesNext")} →
                  </Link>
                )}
              </div>
            )}

            <h1 className="mt-6 font-heading text-2xl font-medium leading-snug text-text sm:text-3xl">
              {title}
            </h1>

            {/* Two lines, not one (2026-07-23). Six controls of six different
                shapes - a channel pill, two bare text spans, and three
                buttons - used to share a single wrapping row, which on a
                phone broke into three ragged lines right under the title.
                Identity first: who made this, when, how long. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted">
              {video.channel?.title &&
                // Links to the channel page when the channel has a handle;
                // otherwise plain text (handle is nullable in the schema).
                (video.channel.handle ? (
                  <Link
                    href={`/channel/${encodeURIComponent(video.channel.handle)}`}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-text outline-none transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {video.channel.title}
                  </Link>
                ) : (
                  <span className="rounded-full border border-border bg-surface px-3 py-1 text-text">
                    {video.channel.title}
                  </span>
                ))}
              {video.published_at && <span>{formatRelativeDate(video.published_at)}</span>}
              {video.duration_seconds != null && <span>{formatDuration(video.duration_seconds)}</span>}
            </div>

            {/* Then the things you can DO, on their own line above a hairline
                so they read as one group of equals rather than as more
                metadata. */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-[13px] text-text-muted">
              <SaveButtons youtubeVideoId={video.youtube_video_id} />
              <ShareButton title={title} path={`/watch/${video.youtube_video_id}`} />
              <WhatsAppShareButton title={title} path={`/watch/${video.youtube_video_id}`} />
            </div>
          </div>
        </Container>
      </div>

      {video.description && (
        <Container className="py-8">
          <div className="mx-auto max-w-4xl">
            <VideoDescription description={video.description} />
          </div>
        </Container>
      )}

      {/* Related videos as one full-bleed row (DESIGN.md #6) - CategoryRow
          carries its own --pad gutters now, so it sits outside Container. */}
      {moreVideos.length > 0 && (
        <CategoryRow
          category={video.category}
          kicker={t("keepWatching")}
          title={t("moreFrom", { category: video.category })}
          videos={moreVideos}
        />
      )}

      <script
        type="application/ld+json"
        // JSON.stringify output is inert data, but "</script>" INSIDE a
        // string value would end the tag early - escaping "<" prevents that.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
