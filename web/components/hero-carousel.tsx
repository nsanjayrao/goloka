"use client"; // auto-advance timer, pause-on-hover/focus, and the active
// slide index are all runtime/browser state - there's no way to express
// "which slide is showing right now" as server-rendered HTML.

import { Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HeroImage } from "@/components/hero-image";
import { categorySubtitle } from "@/lib/category-meta";
import { cleanTitle } from "@/lib/format";
import type { Video } from "@/lib/types";

const AUTO_ADVANCE_MS = 7000;

// Home page hero built from the 5 newest videos (DESIGN.md #4.1). `-mt-14
// sm:-mt-16` pulls the hero up by exactly the top bar's height (TopBar's
// `h-14 sm:h-16`) so the artwork reaches the very top of the page and shows
// through the translucent bar. See `app/page.tsx`'s `flow-root` wrapper,
// which stops that negative margin from shifting the whole page.
export function HeroCarousel({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const singleSlide = videos.length <= 1;

  // Auto-advance every 7s, unless the visitor is hovering/focused inside the
  // carousel or their OS asks for reduced motion. Re-runs whenever `active`
  // or `paused` changes so clicking a dot restarts the countdown cleanly.
  useEffect(() => {
    if (singleSlide || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => {
      setActive((current) => (current + 1) % videos.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [active, paused, singleSlide, videos.length]);

  return (
    <div
      // 70vh on mobile (the hero owns the first screen, DESIGN.md #4.1),
      // 78vh desktop.
      className="group relative -mt-14 h-[70vh] min-h-[420px] w-full overflow-hidden sm:-mt-16 sm:h-[78vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {videos.map((video, index) => {
        const isActive = index === active;
        const title = cleanTitle(video.title);
        const subtitle = categorySubtitle(video.category);
        const tabbable = isActive ? undefined : -1;

        return (
          <div
            key={video.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-500 ease-out ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Stretched image link: clicking anywhere on the artwork opens
                the video. The title/subtitle overlay above it is
                pointer-events-none, so clicks pass THROUGH to here; only the
                CTA buttons re-enable pointer events. This keeps the whole
                slide clickable without nesting anchors. */}
            <Link
              href={`/watch/${video.youtube_video_id}`}
              aria-label={title}
              tabIndex={tabbable}
              className={`absolute inset-0 z-0 block ${isActive ? "" : "pointer-events-none"}`}
            >
              <HeroImage
                videoId={video.youtube_video_id}
                alt={title}
                priority={index === 0}
                className={isActive ? "animate-ken-burns" : undefined}
              />

              {/* Top scrim so the black top bar melts into the artwork. */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
              {/* Bottom scrim: artwork melts into the ivory page (Apple
                  movie-page style) so the title reads with near-black text. */}
              <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-bg via-bg/75 to-transparent" />
              {/* Left wash for extra title contrast, independent of the
                  vertical scrim's height. */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-r from-bg/70 via-bg/10 to-transparent" />
            </Link>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex flex-col items-start gap-3 p-4 pb-16 sm:p-12 sm:pb-14">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-strong sm:text-[13px]">
                Welcome to Goloka
              </span>
              <h1 className="max-w-3xl font-heading text-[40px] font-medium leading-[1.05] text-text line-clamp-2 sm:text-5xl lg:text-[64px]">
                {title}
              </h1>
              {subtitle && (
                <p className="max-w-xl text-[16px] text-text-muted sm:text-[20px]">{subtitle}</p>
              )}
              <div
                className={`mt-2 flex flex-wrap items-center gap-3 ${
                  isActive ? "pointer-events-auto" : "pointer-events-none"
                }`}
              >
                <Link
                  href={`/watch/${video.youtube_video_id}`}
                  tabIndex={tabbable}
                  className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-5 py-2.5 text-base font-medium text-accent-ink outline-none transition-transform duration-200 ease-out hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:hover:scale-100"
                >
                  <Play className="size-4 fill-current" />
                  Watch now
                </Link>
                <Link
                  href="/browse"
                  tabIndex={tabbable}
                  className="inline-flex items-center rounded-full border border-black/10 bg-surface/60 px-5 py-2.5 text-base font-medium text-text outline-none backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Browse
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {!singleSlide && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2 sm:bottom-6">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              aria-label={`Go to slide ${index + 1} of ${videos.length}`}
              // Clicking a dot jumps to that slide and (via the effect above
              // re-running because `active` changed) resets the 7s timer.
              onClick={() => setActive(index)}
              // 24x24 touch target (WCAG target-size); the visible dot is a
              // smaller inner span so the tap area grew, not the dot.
              className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <span
                className={`block rounded-full transition-all duration-200 ease-out ${
                  index === active ? "h-2 w-6 bg-accent" : "size-2 bg-text/30"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
