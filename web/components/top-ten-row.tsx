import { SectionHeader } from "@/components/section-header";
import { Shelf } from "@/components/shelf";
import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/types";

// Apple TV "Top 10" pattern (DESIGN.md #4): the newest arrivals as a normal
// shelf of cards, each carrying a small rank badge in its top-left corner
// (VideoCard's `rank` prop) rather than the old Netflix-style giant watermark
// numeral. Plain CSS scroll-snap via <Shelf> - no client JS beyond the shared
// scroll chrome, and the cards match every other row's size.
export function TopTenRow({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Top 10 New Arrivals" />
      <Shelf>
        {videos.map((video, index) => (
          <div key={video.id} className="snap-item w-[260px] shrink-0 sm:w-[320px]">
            <VideoCard video={video} rank={index + 1} />
          </div>
        ))}
      </Shelf>
    </section>
  );
}
