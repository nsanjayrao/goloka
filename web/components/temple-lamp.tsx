"use client"; // the visitor's local hour decides the light quality - the
// server can't know it, so this stamps `data-period` after mount (see
// lib/temple-period.ts). The thinnest possible client boundary: everything
// else on the watch/chant pages that use this stays a server component.

import { useTemplePeriod } from "@/lib/temple-period";

// The āratī lamp (DESIGN.md #5.2/#5.13), now time-of-day aware: `.lamp`'s
// CSS reads `data-period` to shift its own intensity and warmth (see
// globals.css) - dim and cool before dawn, brightest at midday, warmest at
// dusk, quietest at night. The keyframe animations themselves (breathing,
// flicker) are untouched; only the light's color and strength shift, and
// only once per hour, not continuously - a CSS variable read, not a loop.
export function TempleLamp({ dim = false }: { dim?: boolean }) {
  const period = useTemplePeriod();
  return <div className={dim ? "lamp dim" : "lamp"} data-period={period} aria-hidden="true" />;
}
