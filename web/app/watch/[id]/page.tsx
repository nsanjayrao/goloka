import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryRow } from "@/components/category-row";
import { Container } from "@/components/container";
import { VideoDescription } from "@/components/video-description";
import { formatDuration, formatRelativeDate } from "@/lib/format";
import { getMoreFromCategory, getVideoByYoutubeId } from "@/lib/data";

// The `[id]` segment is the YouTube video ID, not our internal bigint id
// (see the task spec: "id route param is the youtube_video_id").
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoByYoutubeId(id);
  return { title: video?.title ?? "Video" };
}

export default async function WatchPage({ params }: Props) {
  const { id } = await params;
  const video = await getVideoByYoutubeId(id);
  if (!video) notFound();

  const moreVideos = await getMoreFromCategory(video.category, video.youtube_video_id, 10);

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-4xl">
        {/* Standard, unmodified YouTube embed via youtube-nocookie.com -
            Goloka is an index, never a host (CLAUDE.md). No custom
            controls, no download/proxy of the video itself. */}
        <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtube_video_id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>

        <h1 className="mt-4 font-heading text-2xl font-medium text-text">{video.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-muted">
          {video.channel?.title && (
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-text">
              {video.channel.title}
            </span>
          )}
          {video.published_at && <span>{formatRelativeDate(video.published_at)}</span>}
          {video.duration_seconds != null && <span>{formatDuration(video.duration_seconds)}</span>}
        </div>

        {video.description && (
          <div className="mt-4">
            <VideoDescription description={video.description} />
          </div>
        )}
      </div>

      {moreVideos.length > 0 && (
        <div className="mx-auto mt-12 max-w-6xl">
          <CategoryRow category={video.category} title={`More from ${video.category}`} videos={moreVideos} />
        </div>
      )}
    </Container>
  );
}
