import type { ReactNode } from "react";

import { CATEGORY_ICONS, OM_ICON } from "@/components/category-cards";

// The category/topic page header: the site's own gold line iconography on
// a midnight surface - a large ghosted icon watermark behind the Marcellus
// title. Replaces the old newest-video-thumbnail banner (owner feedback
// 2026-07-18: random YouTube title-card art fronting a whole category read
// as noise, on /browse and here alike). Topics fall back to the ॐ glyph,
// which suits them. Server component - no state, no queries.
export function CategoryBanner({
  category,
  count,
  subtitle,
}: {
  category: string;
  count: number;
  /** Optional personality line (category-meta.ts / topic subtitle). */
  subtitle?: string;
}) {
  const icon: ReactNode = CATEGORY_ICONS[category] ?? OM_ICON;

  return (
    <div className="relative overflow-hidden rounded-section border border-border bg-gradient-to-br from-surface to-bg p-6 sm:p-8">
      {/* Ghosted icon watermark - decorative, ours, never random. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -top-5 h-40 w-40 text-accent opacity-[0.14]
          [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:[stroke-width:1.1]
          [&_.om]:block [&_.om]:font-heading [&_.om]:text-[150px] [&_.om]:leading-none"
      >
        {icon}
      </span>
      <div className="mb-4 h-px w-9 bg-accent" aria-hidden="true" />
      <div className="relative flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-heading text-3xl text-text sm:text-4xl">{category}</h1>
        <span className="text-sm text-text-muted">
          {count} video{count === 1 ? "" : "s"}
        </span>
      </div>
      {subtitle && <p className="relative mt-1 max-w-xl text-sm text-text-muted">{subtitle}</p>}
    </div>
  );
}
