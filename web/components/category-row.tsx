import Link from "next/link";

import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/types";

// One Netflix-style horizontally scrollable row (DESIGN.md #4 "Home").
// Plain CSS scroll-snap does the scrolling - no JS needed for the core
// interaction, so this stays a server component.
export function CategoryRow({
  category,
  videos,
  title,
}: {
  category: string;
  videos: Video[];
  /** Heading text, if different from the category name itself (e.g. the
      "More from Kirtans & Bhajans" row on a watch page still links to
      `/browse/Kirtans & Bhajans`). Defaults to `category`. */
  title?: string;
}) {
  if (videos.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-heading text-[26px] font-medium tracking-tight text-text sm:text-[28px]">
          {title ?? category}
        </h2>
        <Link
          href={`/browse/${encodeURIComponent(category)}`}
          className="shrink-0 text-sm text-text-muted transition-colors hover:text-accent"
        >
          View all →
        </Link>
      </div>
      <div className="snap-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-12 lg:px-12">
        {/* No `priority` here: these rows are below the fold (the Hero
            above already claims priority loading for the one LCP-critical
            image), so eager-loading every row's first card would just
            compete with it and hurt the Lighthouse perf target. */}
        {videos.map((video) => (
          <div key={video.id} className="snap-item w-[220px] shrink-0 sm:w-[240px]">
            <VideoCard video={video} />
          </div>
        ))}
      </div>
    </section>
  );
}
