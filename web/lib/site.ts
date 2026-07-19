import { routing } from "@/i18n/routing";

// The live origin, single source of truth (DESIGN.md #7). Used as
// `metadataBase` (so every page's canonical + OG image URL resolves to an
// absolute URL) and by sitemap.ts / robots.ts. If the deploy domain ever
// changes, change it here only.
export const SITE_URL = "https://goloka-three.vercel.app";

/**
 * Builds a page's `alternates` metadata field (canonical + hreflang) for a
 * given locale and a locale-NEUTRAL path ("" for home, "/browse",
 * "/watch/abc123", ...).
 *
 * Next.js does NOT deep-merge object-shaped metadata fields across nested
 * layouts/pages - a page that sets its own `alternates` fully replaces
 * whatever the root layout set, `languages` included. So the layout-level
 * hreflang (i18n goal #7) would silently vanish on every page that also
 * sets its own canonical, unless every page builds its `alternates` through
 * this same helper.
 */
export function localizedAlternates(locale: string, path: string = "") {
  const normalized = path && !path.startsWith("/") ? `/${path}` : path;
  const urlFor = (l: string) => (l === routing.defaultLocale ? normalized || "/" : `/${l}${normalized}`);

  const languages: Record<string, string> = { "x-default": normalized || "/" };
  for (const l of routing.locales) languages[l] = urlFor(l);

  return { canonical: urlFor(locale), languages };
}
