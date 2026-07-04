import { Shelf } from "@/components/shelf";
import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/types";

// Apple's "Top 10" pattern (DESIGN.md #4): a huge rank numeral sits behind
// each card's left edge like a watermark. Plain CSS scroll-snap + a flex
// layout again means no client JS beyond the shared <Shelf> scroll chrome.
export function TopTenRow({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="font-heading text-[26px] font-medium tracking-tight text-text sm:text-[28px]">
          Top 10 New Arrivals
        </h2>
      </div>
      <Shelf>
        {videos.map((video, index) => (
          <div key={video.id} className="snap-item flex shrink-0 items-center">
            {/* The numeral is purely decorative (the rank is also implied by
                shelf order), so it's `aria-hidden` and `select-none` -
                screen readers and copy/paste should skip straight past it
                to the card's own title. `z-0`/`relative z-10` on the two
                pieces of this flex row is what lets the card's rounded
                corner overlap the numeral instead of sitting beside it. */}
            <span
              aria-hidden
              className="z-0 select-none font-heading text-[7rem] font-semibold leading-none text-text sm:text-[8rem]"
            >
              {index + 1}
            </span>
            <div className="relative z-10 -ml-6 w-[240px] sm:-ml-8 sm:w-[300px]">
              <VideoCard video={video} />
            </div>
          </div>
        ))}
      </Shelf>
    </section>
  );
}
