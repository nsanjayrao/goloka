import type { ReactNode } from "react";

// A template (unlike a layout) remounts on every navigation, which replays
// the .route-enter rise-in - a 220ms breath of arrival on each page, the
// closest calm equivalent of view transitions without adopting the
// still-experimental View Transitions integration (owner decision: no
// canary-gated APIs on the live site). Pure CSS, one wrapper div; the
// global prefers-reduced-motion rule turns it fully inert.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
