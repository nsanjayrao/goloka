import Image from "next/image";
import Link from "next/link";

// A fixed set of vivid, deep-toned gradients (DESIGN.md #4): dark posters
// that pop against the white page, like Apple's genre cards - saffron is
// still never used as a fill.
const GRADIENTS = [
  "bg-gradient-to-br from-indigo-950 to-blue-800",
  "bg-gradient-to-br from-teal-950 to-emerald-700",
  "bg-gradient-to-br from-purple-950 to-fuchsia-800",
  "bg-gradient-to-br from-slate-900 to-slate-600",
  "bg-gradient-to-br from-cyan-950 to-sky-700",
];

// The gradient is picked by hashing the category NAME (DESIGN.md #4), not
// by render position: "Kirtans" must wear the same poster on the home
// shelf, the /browse grid, AND the category page banner even though it
// sits at a different index in each. Any cheap deterministic hash works -
// this sums the character codes. Exported so the category-page banner
// (category-banner.tsx) tints its artwork with the same gradient.
export function gradientFor(category: string): string {
  let hash = 0;
  for (const char of category) hash += char.codePointAt(0) ?? 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

// One duotone category poster (DESIGN.md #4), shared by the home
// "Browse by Category" shelf and the /browse index grid. The category's
// newest thumbnail sits underneath; the gradient layer's
// `mix-blend-multiply` darkens the photo with the gradient's hues (a
// duotone effect) instead of just covering it. Categories without artwork
// fall back to the plain gradient - the poster is never an empty box.
export function CategoryPoster({
  category,
  thumbnail,
  meta,
  className = "",
  sizes,
}: {
  category: string;
  thumbnail: string | null;
  /** Optional muted line under the name, e.g. "42 videos" on /browse. */
  meta?: string;
  /** Width/snap classes from the caller - shelf items size themselves,
   * grid items fill their cell. */
  className?: string;
  /** next/image `sizes` hint matching the caller's actual layout. */
  sizes: string;
}) {
  return (
    <Link
      href={`/browse/${encodeURIComponent(category)}`}
      className={`relative block aspect-[2/3] overflow-hidden rounded-xl outline-none
        transition-all duration-200 ease-out
        hover:scale-[1.03] hover:shadow-lg hover:ring-1 hover:ring-text/20
        focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {thumbnail && (
        <Image src={thumbnail} alt="" fill sizes={sizes} className="object-cover" />
      )}
      <div
        className={`absolute inset-0 ${gradientFor(category)}
          ${thumbnail ? "opacity-80 mix-blend-multiply" : ""}`}
      />
      {/* Bottom scrim keeps the name legible whatever the artwork. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      {/* Explicit white, not text-text: these posters are always dark
          regardless of the page's light palette. */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <span className="block font-heading text-lg text-white">{category}</span>
        {meta && <span className="block text-[13px] text-white/70">{meta}</span>}
      </div>
    </Link>
  );
}
