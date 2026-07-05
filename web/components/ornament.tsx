import { cn } from "@/lib/utils";

// A single thin gold flourish (DESIGN.md #6): a hairline rule fading in from
// each side to a small centered lotus/diamond. Used at most twice per page
// (promo band, footer) — sparse is deliberately the point. Purely
// decorative, so aria-hidden. Uses the saffron `accent` token.
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-accent", className)} aria-hidden>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-accent/40 sm:w-14" />
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
        {/* A small four-petal diamond lotus. */}
        <path d="M8 0 L10 6 L8 8 L6 6 Z" />
        <path d="M8 16 L6 10 L8 8 L10 10 Z" />
        <path d="M0 8 L6 6 L8 8 L6 10 Z" opacity="0.65" />
        <path d="M16 8 L10 10 L8 8 L10 6 Z" opacity="0.65" />
      </svg>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-accent/40 sm:w-14" />
    </div>
  );
}
