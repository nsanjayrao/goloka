"use client"; // the visitor's local hour decides where the light is
// coming from - the server can't know it, so this stamps `data-period`
// after mount, exactly as TempleLamp does.

import { useTemplePeriod } from "@/lib/temple-period";

// The jālī (2026-07-23) - the pierced stone screen a temple's light falls
// through. The site already knew what HOUR it was; this is the first thing
// that shows where the light is coming FROM. The lattice rakes long and low
// from the east at maṅgala, pulls tight overhead at rāja-bhoga, stretches
// back the other way at sandhyā, and is all but gone at śayana when only
// lamps are lit.
//
// It shares the one hour computation with the lamp and the ember canvas
// (lib/temple-period.ts), so nothing can disagree about what time it is.
// The whole effect is two repeating gradients and a transform - no image,
// no canvas, no request - and it sits behind everything at very low
// opacity, never over text (DESIGN.md: light falls, text does not move).
export function Jali() {
  const period = useTemplePeriod();
  return <div className="jali" data-period={period} aria-hidden="true" />;
}
