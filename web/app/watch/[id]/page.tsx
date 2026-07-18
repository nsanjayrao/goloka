import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CategoryRow } from "@/components/category-row";
import { Container } from "@/components/container";
import { LiteEmbed } from "@/components/lite-embed";
import { RecordWatch } from "@/components/record-watch";
import { SaveButtons } from "@/components/save-buttons";
import { ShareButton, WhatsAppShareButton } from "@/components/share-button";
import { VideoDescription } from "@/components/video-description";
import { cleanTitle, formatDuration, formatRelativeDate } from "@/lib/format";
import { getMoreFromCategory, getVideoByYoutubeId } from "@/lib/data";
import type { Video } from "@/lib/types";

// The `[id]` segment is the YouTube video ID, not our internal bigint id
// (see the task spec: "id route param is the youtube_video_id").
type Props = { params: Promise<{ id: string }> };

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
  const { id } = await params;
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
    alternates: { canonical: `/watch/${id}` },
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
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) notFound();

  const moreVideos = await getMoreFromCategory(video.category, video.youtube_video_id, 10);
  const title = cleanTitle(video.title);

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
      />

      {/* The cinematic stage (DESIGN.md #6 "Watch page"): the player sits
          directly on the midnight canvas with the āratī lamp glowing behind
          it at low intensity. The old light-theme CSS-var override band is
          gone - the page IS dark now. */}
      <div className="relative overflow-hidden">
        <div className="lamp dim" aria-hidden="true" />
        <Container className="page-top pb-8 sm:pb-10">
          <div className="mx-auto max-w-4xl">
            {/* Standard, unmodified YouTube embed via youtube-nocookie.com -
                Goloka is an index, never a host (see README). No custom
                controls, no download/proxy of the video itself. LiteEmbed
                itself decides whether to render the iframe immediately or
                a tap-to-load facade, based on the visitor's data-saver
                preference - this page always renders it, unconditionally. */}
            <LiteEmbed videoId={video.youtube_video_id} title={title} />

            <h1 className="mt-6 font-heading text-2xl font-medium leading-snug text-text sm:text-3xl">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pb-2 text-[13px] text-text-muted">
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
              <ShareButton title={title} path={`/watch/${video.youtube_video_id}`} />
              <WhatsAppShareButton title={title} path={`/watch/${video.youtube_video_id}`} />
              <SaveButtons youtubeVideoId={video.youtube_video_id} />
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
          kicker="Keep watching"
          title={`More from ${video.category}`}
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
