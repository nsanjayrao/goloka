import Link from "next/link";

import { Thumbnail } from "@/components/thumbnail";
import { cleanTitle, formatDuration, formatRelativeDate, formatViews } from "@/lib/format";
import { languageCode } from "@/lib/language-codes";
import type { Video } from "@/lib/types";

const CARD_SIZES = "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 72vw";

// The card used everywhere a video is listed (DESIGN.md #5.9): 14px-radius
// thumb that lifts with a gold hairline ring, marigold play button scaling
// in, title turning flame. Duration chip bottom-right, LIVE badge top-left.
// Built once - keep every usage going through this component.
export function VideoCard({
  video,
  priority = false,
  rank,
}: {
  video: Video;
  priority?: boolean;
  /** When set, shows a small rank chip in the thumbnail's top-left corner
   * (the "Top 10" treatment). */
  rank?: number;
}) {
  const title = cleanTitle(video.title);
  const duration = formatDuration(video.duration_seconds);
  const isLive = video.is_live === true;
  // English is the catalog's default - badging it on every card would be
  // noise. Only non-English audio is the signal a devotee needs at a
  // glance, so the chip renders for that case alone.
  const lang = video.language && video.language !== "English" ? languageCode(video.language) : null;
  // channel · relative date · view count - the CSS puts the · separators
  // between spans, so missing pieces never leave a dangling dot.
  const metaBits = [
    video.channel?.title,
    formatRelativeDate(video.published_at),
    formatViews(video.view_count),
  ].filter(Boolean) as string[];

  return (
    <Link href={`/watch/${video.youtube_video_id}`} className="card">
      <div className="thumb">
        {video.thumbnail_url ? (
          <Thumbnail src={video.thumbnail_url} alt={title} sizes={CARD_SIZES} priority={priority} />
        ) : (
          <div className="h-full w-full" />
        )}
        {isLive && <span className="live-badge">Live</span>}
        {rank !== undefined && !isLive && <span className="rank">{rank}</span>}
        {lang && (
          <span className="lang" title={video.language ?? undefined}>
            {lang}
          </span>
        )}
        <span className="play" aria-hidden="true">
          <span>
            <svg viewBox="0 0 16 16">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          </span>
        </span>
        {duration && !isLive && <span className="dur">{duration}</span>}
      </div>
      {/* 2-line clamp with the full text in `title` (DESIGN.md #8.4). */}
      <h3 title={title}>{title}</h3>
      {metaBits.length > 0 && (
        <p className="meta">
          {metaBits.map((bit, index) => (
            <span key={index}>{bit}</span>
          ))}
        </p>
      )}
    </Link>
  );
}
