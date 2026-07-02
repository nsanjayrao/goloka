import Image from "next/image";
import Link from "next/link";

import { formatDuration, formatRelativeDate } from "@/lib/format";
import type { Video } from "@/lib/types";

// The card used everywhere a video is listed: home rows, browse grids,
// search results, "more from this category". Built once per DESIGN.md #4 -
// keep every usage going through this component so they never drift apart.
export function VideoCard({ video, priority = false }: { video: Video; priority?: boolean }) {
  const duration = formatDuration(video.duration_seconds);
  const channelTitle = video.channel?.title ?? "";

  return (
    <Link
      href={`/watch/${video.youtube_video_id}`}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-xl"
    >
      <div
        className="relative aspect-video overflow-hidden rounded-xl border border-border
          transition-all duration-200 ease-out
          group-hover:scale-[1.02] group-hover:border-accent/40 group-hover:shadow-md"
      >
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="h-full w-full bg-surface-2" />
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 rounded-md bg-surface-2/90 px-1.5 py-0.5 text-[12px] text-text">
            {duration}
          </span>
        )}
      </div>
      <div className="mt-2">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-text">
          {video.title}
        </h3>
        <p className="mt-1 text-[13px] text-text-muted">
          {channelTitle}
          {channelTitle && video.published_at ? " · " : ""}
          {formatRelativeDate(video.published_at)}
        </p>
      </div>
    </Link>
  );
}
