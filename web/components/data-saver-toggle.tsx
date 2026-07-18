"use client"; // reads/writes the visitor's own data-saver preference
// (lib/data-saver.ts, localStorage) - inherently client-only.

import { setDataSaver, useDataSaver } from "@/lib/data-saver";
import { cn } from "@/lib/utils";

// The footer "Data saver" switch: flips lib/data-saver.ts's stored
// preference, which the watch page (LiteEmbed), thumbnails, and the hero
// all read to trim their own payload. Same pill language as the watch
// page's Favourite/Watch later chips (SaveButtons), with a small on/off
// state pill instead of an icon. `normal-case`/`tracking-normal` opt this
// button out of .foot-links' uppercase link styling (globals.css) - it's a
// control, not a nav link.
export function DataSaverToggle() {
  const on = useDataSaver();

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setDataSaver(!on)}
      title="Auto-enabled on slow connections"
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[13px] font-normal normal-case tracking-normal text-text-muted outline-none transition-colors hover:border-hairline hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
    >
      Data saver
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
          on ? "bg-accent text-accent-ink" : "bg-shyama-2 text-text-muted"
        )}
      >
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}
