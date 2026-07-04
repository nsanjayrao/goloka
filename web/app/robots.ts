import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Index everything (Goloka is a public directory) and point crawlers at the
// sitemap. Next serves this at /robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
