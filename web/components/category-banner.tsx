import Image from "next/image";

import { gradientFor } from "@/components/category-poster";

// The category page's duotone banner header (DESIGN.md "Category page"):
// the same artwork-tinted-by-gradient treatment as CategoryPoster, but
// landscape instead of a 2:3 poster, so the artwork the user clicked on
// the browse shelf/grid follows them into the page. Shares gradientFor so
// a category wears one identity everywhere. Server component - no state.
export function CategoryBanner({
  category,
  thumbnail,
  count,
  subtitle,
}: {
  category: string;
  thumbnail: string | null;
  count: number;
  /** Optional personality line (category-meta.ts); omitted for unknown
   * categories. */
  subtitle?: string;
}) {
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-xl sm:h-44">
      {thumbnail && (
        <Image
          src={thumbnail}
          alt=""
          fill
          // The banner is wide and short; the thumbnail is 16:9, so
          // object-cover crops top/bottom. `object-center` keeps the
          // middle of the frame (usually the subject) in view.
          sizes="(min-width: 1280px) 1280px, 100vw"
          className="object-cover object-center"
          priority
        />
      )}
      <div
        className={`absolute inset-0 ${gradientFor(category)}
          ${thumbnail ? "opacity-80 mix-blend-multiply" : ""}`}
      />
      {/* Bottom scrim keeps the white heading legible over any artwork. */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        {/* Explicit white, not text-text: the banner is always dark
            regardless of the page's light palette. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-heading text-3xl font-medium text-white sm:text-4xl">{category}</h1>
          <span className="text-sm text-white/70">
            {count} video{count === 1 ? "" : "s"}
          </span>
        </div>
        {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
      </div>
    </div>
  );
}
