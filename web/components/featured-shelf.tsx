import { Shelf } from "@/components/shelf";
import { SpotlightCard } from "@/components/spotlight-card";
import { VideoCard } from "@/components/video-card";
import type { Video } from "@/lib/types";

// The Featured block (DESIGN.md #4.8): the top curated pick leads as a large
// editorial spotlight, the rest follow as a normal card row beneath it. The
// spotlight's own "Featured" chip labels the whole block, so no section
// header is needed here (that would be a redundant second "Featured").
export function FeaturedShelf({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;
  const [lead, ...rest] = videos;

  return (
    <section className="flex flex-col gap-5">
      <SpotlightCard video={lead} />
      {rest.length > 0 && (
        <Shelf>
          {rest.map((video) => (
            <div key={video.id} className="snap-item w-[260px] shrink-0 sm:w-[320px]">
              <VideoCard video={video} />
            </div>
          ))}
        </Shelf>
      )}
    </section>
  );
}
