import Link from "next/link";

import { Thumbnail } from "@/components/thumbnail";
import { cleanTitle, formatDuration, formatRelativeDate, formatViews } from "@/lib/format";
import type { Video } from "@/lib/types";

const CARD_SIZES = "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

// The card used everywhere a video is listed: home rows, browse grids,
// search results, "more from this category". Built once per DESIGN.md #4 -
// keep every usage going through this component so they never drift apart.
export function VideoCard({
  video,
  priority = false,
  rank,
}: {
  video: Video;
  priority?: boolean;
  /** When set, shows a small rank badge in the thumbnail's top-left corner -
   * the Apple TV "Top 10" treatment (see TopTenRow). */
  rank?: number;
}) {
  const title = cleanTitle(video.title);
  const duration = formatDuration(video.duration_seconds);
  const channelTitle = video.channel?.title ?? "";
  // channel · relative date · view count - dropping whichever pieces are
  // missing, joined so the one-line meta never shows a dangling separator.
  const meta = [channelTitle, formatRelativeDate(video.published_at), formatViews(video.view_count)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/watch/${video.youtube_video_id}`}
      className="group block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {/* The artwork IS the card (borderless, Apple-TV): 18px radius, a soft
          resting shadow so it floats on the ivory canvas, lifting on hover.
          bg-surface-2 shows warm behind the image until it fades in. */}
      <div
        className="relative aspect-video overflow-hidden rounded-card bg-surface-2 shadow-card
          transition-[transform,box-shadow] duration-[250ms] ease-spring
          group-hover:scale-[1.03] group-hover:shadow-lift
          group-active:scale-[0.98]
          motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      >
        {video.thumbnail_url ? (
          <Thumbnail
            src={video.thumbnail_url}
            alt={title}
            sizes={CARD_SIZES}
            priority={priority}
            className="group-hover:brightness-[1.05]"
          />
        ) : (
          <div className="h-full w-full bg-surface-2" />
        )}

        {/* Overlays as dark glass pills - they read on ANY thumbnail, bright
            or dark, unlike a light chip (Apple/YouTube convention). */}
        {rank !== undefined && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-base font-semibold text-white backdrop-blur-sm">
            {rank}
          </span>
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white backdrop-blur-sm">
            {duration}
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="line-clamp-1 text-[16px] font-medium leading-snug text-text">{title}</h3>
        <p className="mt-1 truncate text-[13px] text-text-muted">{meta}</p>
      </div>
    </Link>
  );
}
