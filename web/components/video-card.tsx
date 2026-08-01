import { useTranslations } from "next-intl";

import { Thumbnail } from "@/components/thumbnail";
import { Link } from "@/i18n/navigation";
import { cleanTitle, formatDuration, formatRelativeDate } from "@/lib/format";
import { cardProgress } from "@/lib/recently-watched";
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
  resumeAt,
}: {
  video: Video;
  priority?: boolean;
  /** When set, shows a small rank chip in the thumbnail's top-left corner
   * (the "Top 10" treatment). */
  rank?: number;
  /** Seconds already watched. Supplied only by the two surfaces that know it
   * - Continue Watching and the library's history grid - so every other row
   * renders exactly as before. Turns the duration chip into "N min left" and
   * draws a progress line across the foot of the thumbnail: without it, a
   * devotee has no way to tell which lecture they are partway through until
   * they press play and the player jumps. */
  resumeAt?: number;
}) {
  const t = useTranslations("videoCard");
  const title = cleanTitle(video.title);
  const duration = formatDuration(video.duration_seconds);

  // One guarded, tested decision (lib/recently-watched.ts) rather than an
  // inline condition. The inline version compared `resumeAt < total`, which a
  // lecture abandoned five seconds from the end passes - leaving "1 min left"
  // under a full bar on that card permanently.
  const progress = cardProgress(resumeAt, video.duration_seconds);
  const isLive = video.is_live === true;
  // English is the catalog's default - badging it on every card would be
  // noise. Only non-English audio is the signal a devotee needs at a
  // glance, so the chip renders for that case alone.
  const lang = video.language && video.language !== "English" ? languageCode(video.language) : null;
  // channel · relative date - the CSS puts the · separator between spans,
  // so a missing piece never leaves a dangling dot. Raw view counts were
  // removed from this line (Design Manifesto, "The Courtyard", 2026-07-22):
  // a number badge turns liturgical footage into a metric. Popularity
  // still exists as a SORT ("Most watched" in FilterChips, view_count in
  // lib/data.ts) - only the per-card numeral is gone.
  const metaBits = [video.channel?.title, formatRelativeDate(video.published_at)].filter(
    Boolean
  ) as string[];

  return (
    <Link href={`/watch/${video.youtube_video_id}`} className="card">
      <div className="thumb">
        {video.thumbnail_url ? (
          <Thumbnail src={video.thumbnail_url} alt={title} sizes={CARD_SIZES} priority={priority} />
        ) : (
          <div className="h-full w-full" />
        )}
        {isLive && <span className="live-badge">{t("live")}</span>}
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
        {/* "22 min left" replaces the runtime once a devotee is partway in:
            at that point how much is LEFT is the useful number, and the total
            runtime is something they already know. */}
        {!isLive &&
          (progress ? (
            <span className="dur">{t("minLeft", { minutes: progress.minutesLeft })}</span>
          ) : (
            duration && <span className="dur">{duration}</span>
          ))}
        {/* The progress line. aria-hidden because the "N min left" chip above
            already says this in words - a progressbar role here would make a
            screen reader announce the same fact twice per card, across a row
            of twelve. */}
        {progress && (
          <span className="card-progress" aria-hidden="true">
            <span style={{ width: `${progress.percent}%` }} />
          </span>
        )}
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
