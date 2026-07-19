import Image from "next/image";
import Link from "next/link";

import { cleanTitle } from "@/lib/format";
import type { Video } from "@/lib/types";

// "1.9K watching" - compact notation, locale-stable for SSR.
function formatWatching(count: number): string {
  return `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count)} watching`;
}

// Live from the dhāma (DESIGN.md #5.6): live darshan cards under the hero.
// A full section (kicker + Marcellus title, like every other section) with
// the pulsing red dot on the kicker line - the original label-only strip
// read as an orphan sliver (owner feedback 2026-07-18). Renders nothing
// until getLiveVideos() returns rows. Text column is a <div> with
// min-width:0 so long titles ellipsis, never overflow (#8.3/#8.5).
export function LiveStrip({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;

  return (
    <section id="live" className="home-section">
      <div className="section-head">
        <h2>
          <span className="kicker live-kicker">Streaming now</span>
          <span>
            <span className="mark" aria-hidden="true">
              ❋
            </span>
            Live from the dhāma
          </span>
        </h2>
      </div>
      <div className="live-grid gutter">
        {videos.map((video) => {
          const title = cleanTitle(video.title);
          return (
            <Link key={video.id} href={`/watch/${video.youtube_video_id}`} className="live-card">
              {video.thumbnail_url && (
                <Image
                  src={video.thumbnail_url}
                  alt=""
                  width={148}
                  height={83}
                  loading="lazy"
                />
              )}
              <div className="lc-body">
                {video.channel?.title && <div className="lc-temple">{video.channel.title}</div>}
                <div className="lc-title" title={title}>
                  {title}
                </div>
                {typeof video.live_viewer_count === "number" && (
                  <div className="lc-viewers">{formatWatching(video.live_viewer_count)}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
