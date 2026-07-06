import { SectionHeader } from "@/components/section-header";
import { Shelf } from "@/components/shelf";
import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/types";

// One Netflix-style horizontally scrollable row (DESIGN.md #4 "Home").
// Plain CSS scroll-snap does the scrolling - no JS needed for the core
// interaction, so this stays a server component. The paddle arrows/edge
// fades do need the browser (scroll position, click-to-scroll), so that
// part alone is carved out into <Shelf>, a client component.
export function CategoryRow({
  category,
  videos,
  title,
  href,
}: {
  /** The category this row links its "View all →" to. Omit it (e.g. the
      curated "Featured" shelf, which has no browse page) and the link is
      hidden - `title` then supplies the heading. */
  category?: string;
  videos: Video[];
  /** Heading text, if different from the category name itself (e.g. the
      "More from Kirtans & Bhajans" row on a watch page still links to
      `/browse/Kirtans & Bhajans`). Defaults to `category`. */
  title?: string;
  /** Overrides where "View all →" points - used by topic shelves
      (e.g. /topic/radharani) that aren't a browse category. */
  href?: string;
}) {
  if (videos.length === 0) return null;

  const viewAllHref = href ?? (category ? `/browse/${encodeURIComponent(category)}` : undefined);

  return (
    <section>
      <SectionHeader title={title ?? category ?? ""} href={viewAllHref} />
      <Shelf>
        {/* No `priority` here: these rows are below the fold (the Hero
            above already claims priority loading for the one LCP-critical
            image), so eager-loading every row's first card would just
            compete with it and hurt the Lighthouse perf target. */}
        {videos.map((video) => (
          <div key={video.id} className="snap-item w-[260px] shrink-0 sm:w-[320px]">
            <VideoCard video={video} />
          </div>
        ))}
      </Shelf>
    </section>
  );
}
