import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Runs on every localized page route; explicitly skips:
  // - api/_next/_vercel internals
  // - opengraph-image, share-target, and c/<id> - the routes the i18n plan
  //   requires to stay completely outside locale routing (goal #3)
  // - anything with a file extension (robots.txt, sitemap.xml,
  //   manifest.json, sw.js, ekadashi.ics, icon.svg, marcellus-og.ttf, and
  //   any static asset under /public)
  matcher: ["/((?!api|_next|_vercel|opengraph-image|share-target|c/|.*\\..*).*)"],
};
