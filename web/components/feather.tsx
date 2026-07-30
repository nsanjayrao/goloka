"use client"; // whether the feather falls is decided in the browser, once,
// after mount - it must never be part of the server render or it would be
// baked into the ISR cache and become "every visitor", which is exactly
// what it must not be.

import { useEffect, useState } from "react";

import { useDataSaver } from "@/lib/data-saver";

// Roughly one visit in fifteen.
const CHANCE = 1 / 15;

// The feather (2026-07-23).
//
// Everything else in this app happens every time, exactly as specified -
// that is Śrīmatī Rādhārāṇī's discipline, and it is most of the design.
// But the tradition is Rādhā AND Kṛṣṇa, and He is a thief and a
// flute-player who does not keep appointments. Software is proud of being
// deterministic, which is a large part of why no software feels alive.
//
// So: one peacock feather crosses the page, sometimes. It cannot be
// triggered, it never repeats within a visit, no setting mentions it, and
// nothing in the interface ever refers to it. A devotee will see it perhaps
// twice a year and tell someone.
//
// The rule this belongs to: anything that happens EVERY time is Her
// discipline; anything that happens SOMETIMES is His play. Three such
// things exist in the whole app. It stays three - the moment līlā becomes
// a feature list it becomes a casino, and the difference between delight
// and manipulation is precisely that you cannot chase it.
export function Feather() {
  const dataSaver = useDataSaver();
  // Null means "not falling". A number is the starting offset across the
  // page - held in state rather than computed during render, because
  // rendering must be pure and a re-render would otherwise teleport it.
  const [drift, setDrift] = useState<number | null>(null);

  useEffect(() => {
    // Not on a metered connection, and not for a devotee who has asked the
    // room to be still. Delight is never worth overriding a preference.
    if (dataSaver) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (Math.random() > CHANCE) return;

    // A little after arrival, so it drifts through a settled page rather
    // than competing with it.
    const start = setTimeout(() => setDrift(12 + Math.random() * 66), 4000);
    return () => clearTimeout(start);
  }, [dataSaver]);

  if (drift === null) return null;

  return (
    <svg
      className="feather"
      style={{ left: `${drift}%` }}
      viewBox="0 0 24 96"
      aria-hidden="true"
      onAnimationEnd={() => setDrift(null)}
    >
      {/* A peacock feather, drawn rather than imported: the quill, the barbs
          thinning toward the tip, and the eye. */}
      <path d="M12 96 C 12 70, 12 44, 12 22" stroke="#7d8f5a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <g stroke="#8fa063" strokeWidth="0.7" opacity="0.75" strokeLinecap="round">
        <path d="M12 78 L 5 71 M12 78 L 19 71 M12 66 L 4 58 M12 66 L 20 58 M12 54 L 4 46 M12 54 L 20 46 M12 42 L 5 35 M12 42 L 19 35" />
      </g>
      <ellipse cx="12" cy="18" rx="9.5" ry="13" fill="#2f6d63" opacity="0.85" />
      <ellipse cx="12" cy="19" rx="6.5" ry="9" fill="#1d4f7a" opacity="0.9" />
      <ellipse cx="12" cy="20" rx="3.6" ry="5.2" fill="#123a63" />
      <ellipse cx="12" cy="20" rx="1.5" ry="2.4" fill="#c9962e" opacity="0.9" />
    </svg>
  );
}
