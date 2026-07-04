import Image from "next/image";
import Link from "next/link";

import { cleanTitle, formatDuration, formatRelativeDate } from "@/lib/format";
import type { Video } from "@/lib/types";

// The card used everywhere a video is listed: home rows, browse grids,
// search results, "more from this category". Built once per DESIGN.md #4 -
// keep every usage going through this component so they never drift apart.
export function VideoCard({ video, priority = false }: { video: Video; priority?: boolean }) {
  const title = cleanTitle(video.title);
  const duration = formatDuration(video.duration_seconds);
  const channelTitle = video.channel?.title ?? "";

  return (
    <Link
      href={`/watch/${video.youtube_video_id}`}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-xl"
    >
      <div
        className="relative aspect-video overflow-hidden rounded-xl
          transition-all duration-200 ease-out
          group-hover:scale-[1.03] group-hover:shadow-lg group-hover:ring-1 group-hover:ring-text/20"
      >
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={title}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-all duration-200 ease-out group-hover:brightness-105"
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
        <h3 className="line-clamp-1 text-[15px] font-medium leading-snug text-text">
          {title}
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
