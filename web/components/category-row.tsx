import { SectionHeader } from "@/components/section-header";
import { Shelf } from "@/components/shelf";
import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/types";

// One horizontally scrollable row (DESIGN.md #5.7): kicker + Marcellus
// heading, then the full-bleed snap row. CSS scroll-snap does the core
// interaction, so this stays a server component; the paddle arrows live in
// <Shelf>, the one thin client part.
export function CategoryRow({
  category,
  videos,
  title,
  kicker,
  href,
}: {
  /** The category this row links its "View all →" to. Omit it (e.g. the
      curated "Featured" shelf, which has no browse page) and the link is
      hidden - `title` then supplies the heading. */
  category?: string;
  videos: Video[];
  /** Heading text, if different from the category name itself. */
  title?: string;
  /** Small uppercase line above the heading (DESIGN.md #4). */
  kicker?: string;
  /** Overrides where "View all →" points - used by topic shelves. */
  href?: string;
}) {
  if (videos.length === 0) return null;

  const heading = title ?? category ?? "";
  const viewAllHref = href ?? (category ? `/browse/${encodeURIComponent(category)}` : undefined);

  return (
    <section className="home-section cv">
      <SectionHeader title={heading} kicker={kicker} href={viewAllHref} />
      <Shelf label={heading}>
        {/* No `priority`: rows are below the fold; the hero owns the LCP. */}
        {/* Keyed by the YouTube id, not the row id: Continue Watching
            entries are synthesized with id 0, which would collide. */}
        {videos.map((video) => (
          <VideoCard key={video.youtube_video_id} video={video} />
        ))}
      </Shelf>
    </section>
  );
}
