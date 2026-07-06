import { Play } from "lucide-react";
import Link from "next/link";

import { Thumbnail } from "@/components/thumbnail";
import { cleanTitle } from "@/lib/format";
import type { Video } from "@/lib/types";

// The editorial "spotlight" - one large card leading the Featured shelf so
// curation reads as an event, not just another row (DESIGN.md #4.8 row
// variety). Deliberately a WIDE, short banner on desktop (5:2), not a tall
// full-bleed block, so it doesn't ape the rotating hero above it; on mobile
// it relaxes to 16:9. Title/CTA overlaid on the artwork.
export function SpotlightCard({ video }: { video: Video }) {
  const title = cleanTitle(video.title);

  return (
    <Link
      href={`/watch/${video.youtube_video_id}`}
      className="group relative block overflow-hidden rounded-3xl shadow-card outline-none
        transition-[transform,box-shadow] duration-[250ms] ease-spring hover:shadow-lift
        focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg
        motion-reduce:transition-none"
    >
      <div className="relative aspect-video bg-surface-2 sm:aspect-[5/2]">
        {video.thumbnail_url ? (
          <Thumbnail
            src={video.thumbnail_url}
            alt={title}
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="group-hover:brightness-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-surface-2" />
        )}

        {/* Bottom scrim keeps the overlaid title/CTA legible on any artwork. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
            Featured
          </span>
          <h3 className="mt-3 max-w-2xl font-heading text-2xl font-medium leading-tight text-white line-clamp-2 sm:text-4xl">
            {title}
          </h3>
          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100">
              <Play className="size-4 fill-current" />
              Watch now
            </span>
            {video.channel?.title && (
              <span className="truncate text-sm text-white/80">{video.channel.title}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
