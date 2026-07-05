"use client"; // auto-advance timer, pause-on-hover/focus, and the active
// slide index are all runtime/browser state - there's no way to express
// "which slide is showing right now" as server-rendered HTML.

import { Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HeroImage } from "@/components/hero-image";
import { cleanTitle } from "@/lib/format";
import type { Video } from "@/lib/types";

const AUTO_ADVANCE_MS = 7000;

// Home page hero built from the 5 newest videos (DESIGN.md #4), Apple-TV
// scale. `-mt-14 sm:-mt-16` pulls the hero up by exactly the top bar's own
// height (TopBar's `h-14 sm:h-16`), so the hero's artwork reaches the very
// top of the page and shows through the translucent black top bar instead
// of being pushed down below it. See `app/page.tsx` for the matching
// `flow-root` wrapper, which stops that negative margin from collapsing
// further up into `<main>`/`<body>` - without it the whole page would
// shift, not just the hero.
export function HeroCarousel({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const singleSlide = videos.length <= 1;

  // Auto-advance every 7s, unless the visitor is hovering/focused inside the
  // carousel (they're clearly paying attention to *this* slide) or their OS
  // says they'd rather not see motion. Re-runs whenever `active` or `paused`
  // changes so that clicking a dot (which sets `active` directly) restarts
  // the 7s countdown from that new slide, instead of firing early using time
  // left over from the slide the visitor just left.
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
      className="group relative -mt-14 h-[55vh] min-h-[360px] w-full overflow-hidden sm:-mt-16 sm:h-[78vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {videos.map((video, index) => (
        <Link
          key={video.id}
          href={`/watch/${video.youtube_video_id}`}
          aria-hidden={index !== active}
          tabIndex={index === active ? undefined : -1}
          // All slides are stacked in the same spot and crossfaded with
          // opacity (DESIGN.md #4: "plain CSS crossfade, ~500ms") - simpler
          // and cheaper than mounting/unmounting slides, and it means each
          // slide's <HeroImage> only ever has to load once. Inactive slides
          // get `pointer-events-none` so they can't be clicked or tabbed to
          // while invisible.
          className={`absolute inset-0 block transition-opacity duration-500 ease-out ${
            index === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* Only the FIRST slide is `priority` (it's the LCP element).
              The other 4 default to lazy so 5 full-bleed maxresdefault
              images don't all fetch at high priority at once and starve
              the one the visitor actually sees first - that was pushing
              home's LCP to ~4s (Lighthouse, 2026-07-04). */}
          <HeroImage videoId={video.youtube_video_id} alt={cleanTitle(video.title)} priority={index === 0} />

          {/* Top scrim: the black top bar (see top-bar.tsx) is slightly
              translucent, so this darkens the artwork's top edge and lets
              the bar melt into the hero instead of ending in a hard line. */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
          {/* Bottom scrim: solid `bg` (white) fading to transparent - the
              artwork melts into the white page, Apple movie-page style, so
              the title/button zone reads with normal near-black text no
              matter how bright or dark the thumbnail is there. */}
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-bg via-bg/70 to-transparent" />
          {/* Left-to-right scrim behind the title itself - a second,
              subtler layer of contrast that doesn't depend on how tall the
              vertical scrim above happens to be, since the title's exact
              colour clash risk is about what's directly behind it, left
              side. */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-r from-bg/70 via-bg/10 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-4 sm:p-12">
            {/* Brand eyebrow (DESIGN.md #6). accent-strong (darker gold)
                keeps AA contrast on the whitish lower scrim. */}
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-strong sm:text-[13px]">
              Welcome to Goloka
            </span>
            <span className="rounded-full border border-accent/60 bg-bg/40 px-3 py-1 text-[13px] text-accent">
              {video.category}
            </span>
            <h1 className="max-w-2xl font-heading text-3xl font-medium leading-tight text-text sm:text-4xl sm:leading-tight lg:text-5xl">
              {cleanTitle(video.title)}
            </h1>
            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink transition-transform duration-200 ease-out group-hover:scale-[1.02]">
              <Play className="size-4 fill-current" />
              Watch now
            </span>
          </div>
        </Link>
      ))}

      {!singleSlide && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2 sm:bottom-6">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              aria-label={`Go to slide ${index + 1} of ${videos.length}`}
              // Clicking a dot both jumps to that slide and (via the effect
              // above re-running because `active` changed) resets the 7s
              // auto-advance timer, so the carousel doesn't jump again a
              // moment later using time already spent on the old slide.
              onClick={() => setActive(index)}
              // The button is a 24x24 touch target (WCAG target-size, min
              // 24px - Lighthouse flagged the bare 8px dots); the visual dot
              // is a smaller inner span, so the tap area grew without the
              // dots looking bigger.
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
