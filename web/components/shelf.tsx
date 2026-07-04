"use client"; // tracking scroll position (for the paddle arrows + edge
// fades) and click-to-scroll both need the browser. CategoryRow itself
// stays a server component - the actual <VideoCard> elements are still
// rendered on the server and simply passed through as `children` (the RSC
// "children as props" pattern), so only this thin scroll container opts
// into the client.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function Shelf({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Which end(s) still have more content to scroll to - drives both the
  // paddle arrows (hide the one pointing at an end you're already at) and
  // the soft edge gradients (only show a fade where there's actually more
  // to see).
  function updateScrollState() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    // 1px tolerance: fractional widths (some zoom levels/DPRs) can leave
    // scrollLeft a hair short of the true scrollable max.
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    // A row can also change scrollability because its *content* resizes
    // (e.g. the viewport is resized, or web fonts finish loading and
    // reflow text) without the user ever scrolling - a ResizeObserver
    // catches that; a plain scroll listener alone wouldn't.
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function scrollByPage(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    // One visible "page" per click, matching the Apple TV shelf pattern.
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  return (
    // The negative margins (bleeding the row out to the screen edge, past
    // Container's padding) live on THIS wrapper, not the scroller inside:
    // the paddles and edge fades below are absolutely positioned against
    // the wrapper's edges, so its edges must be the row's true visible
    // edges - otherwise the fades would float 16-48px inboard with raw
    // card slices peeking out past them.
    <div className="group/shelf relative -mx-4 sm:-mx-6 lg:-mx-12">
      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        // `scroll-px-*` (CSS `scroll-padding`) mirrors the `px-*` values
        // exactly. Without it, `scroll-snap-align: start` on the cards
        // makes the browser scroll *past* this padding on load, to bring
        // the first card flush with the row's true edge instead of resting
        // in the gutter aligned with the heading above it - scroll-padding
        // tells the snap algorithm "treat this inset as already aligned".
        className="snap-row flex gap-4 overflow-x-auto px-4 pb-2 scroll-px-4 sm:px-6 sm:scroll-px-6 lg:px-12 lg:scroll-px-12"
      >
        {children}
      </div>

      {/* Paddle arrow + soft gradient fade at each end - only rendered
          while there's more to scroll to in that direction, and only on
          desktop (`lg:`): these are a hover affordance, and "hover" isn't
          a touch-device concept. Real, focusable <button>s (not divs) so
          keyboard users can reach them; opacity (not `hidden`) is what
          reveals them on hover/focus so they stay in the tab order and
          keyboard-operable even before the row is hovered. `pointer-events`
          is what keeps the invisible button from swallowing mouse clicks
          meant for the edge card underneath - keyboard focus/activation
          isn't pointer-based, so it still works with `pointer-events-none`. */}
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-bg to-transparent lg:block" />
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByPage(-1)}
            className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-12 items-center justify-center opacity-0
              outline-none transition-opacity duration-200 ease-out
              hover:bg-bg/20 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent
              group-hover/shelf:pointer-events-auto group-hover/shelf:opacity-100 lg:flex"
          >
            <ChevronLeft className="size-6 text-text" />
          </button>
        </>
      )}
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-bg to-transparent lg:block" />
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByPage(1)}
            className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-12 items-center justify-center opacity-0
              outline-none transition-opacity duration-200 ease-out
              hover:bg-bg/20 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent
              group-hover/shelf:pointer-events-auto group-hover/shelf:opacity-100 lg:flex"
          >
            <ChevronRight className="size-6 text-text" />
          </button>
        </>
      )}
    </div>
  );
}
