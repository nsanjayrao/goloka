// The live origin, single source of truth (DESIGN.md #7). Used as
// `metadataBase` (so every page's canonical + OG image URL resolves to an
// absolute URL) and by sitemap.ts / robots.ts. If the deploy domain ever
// changes, change it here only.
export const SITE_URL = "https://goloka-three.vercel.app";
