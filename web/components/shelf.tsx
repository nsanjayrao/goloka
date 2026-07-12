"use client"; // tracking scroll position (to hide an arrow when its end is
// reached) and click-to-scroll need the browser. The cards themselves are
// server-rendered and passed through as `children` (RSC children-as-props),
// so only this thin scroll container opts into the client.

import { useEffect, useRef, useState } from "react";

// The prototype row (DESIGN.md #5.7): full-bleed scroller with --pad-wide
// edge-fade masks, mandatory snap, and round paddle arrows that appear on
// hover (hover-capable devices only, via CSS). Arrows are real buttons -
// keyboard-focusable, with a :focus-visible reveal in globals.css.
export function Shelf({ children, label }: { children: React.ReactNode; label?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    // Content can change scrollability without the user scrolling (resize,
    // fonts loading) - a ResizeObserver catches that.
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function step(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    // One 80%-viewport page per click (prototype step).
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="row-wrap">
      {canScrollLeft && (
        <button type="button" className="row-arrow prev" aria-label="Scroll back" onClick={() => step(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button type="button" className="row-arrow next" aria-label="Scroll forward" onClick={() => step(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      <div ref={scrollerRef} onScroll={updateScrollState} className="row" role="list" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
