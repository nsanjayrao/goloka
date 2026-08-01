import Image from "next/image";

import { panelArtPath, type StoryPanel } from "@/lib/ekadashi-stories";
import { cn } from "@/lib/utils";

// The panel grid for an ekādaśī māhātmya (DESIGN.md §6). A server component
// on purpose - it is prose and pictures, nothing here reacts to anything, so
// none of it belongs in the client bundle.
//
// The art box holds its 4:3 whether or not art exists, so dropping the first
// panel-1.webp into public/ekadashi/<slug>/ moves nothing on the page. When
// there is no art the box renders the pierced-screen lattice and the panel's
// number: a designed state, so a story with no illustrations at all still
// reads as finished rather than unfinished.
export function ComicStrip({
  slug,
  panels,
  storyName,
}: {
  slug: string;
  panels: StoryPanel[];
  /** Used to build each panel's alt text, so it names the story it belongs to. */
  storyName: string;
}) {
  return (
    <div className="comic-strip">
      {panels.map((panel, index) => (
        <figure
          key={index}
          className={cn("comic-panel", panel.span === "full" && "comic-panel--full")}
        >
          {panel.art ? (
            <div className="comic-art">
              <Image
                src={panelArtPath(slug, index)}
                alt={`${storyName}, panel ${index + 1}: ${panel.caption}`}
                width={1200}
                height={900}
                // A full-width panel is the page measure; a half-width one is
                // half of it above the 640px breakpoint.
                sizes={panel.span === "full" ? "(width >= 64rem) 900px, 100vw" : "(width >= 40rem) 450px, 100vw"}
              />
            </div>
          ) : (
            // aria-hidden: the lattice carries no information, and the
            // caption below is the panel's actual content. A screen reader
            // announcing "panel 3" twice would be noise.
            <div className="comic-art comic-art--empty" aria-hidden>
              <span>{index + 1}</span>
            </div>
          )}
          <figcaption className="comic-caption">{panel.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
