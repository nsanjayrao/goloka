import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Points at the request-config module that resolves locale + messages for
// server components (i18n/request.ts) - the standard next-intl App Router
// wiring.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Both are YouTube's own CDNs: i.ytimg.com serves video thumbnails,
    // yt3.ggpht.com serves channel avatars. next/image needs remote hosts
    // allow-listed explicitly (images.domains is deprecated in Next 16 -
    // remotePatterns is the replacement).
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
    ],
    // Next 16 silently coerces an undeclared `quality` prop back to 75 -
    // 50 must be listed here for the hero backdrop's quality={50} (it
    // renders at 34% opacity under a scrim; 50 is visually identical and
    // the image is the page's LCP element on mobile). 35 is data-saver
    // mode's quality (Thumbnail, HeroImage, LiteEmbed's facade) - a visible
    // but deliberate trade for real kilobytes saved on small data packs.
    qualities: [35, 50, 75],
    // Next's default deviceSizes runs 640...3840 in eight steps, and every
    // <Image> emits a srcset candidate for each. Home renders ~64 thumbnails,
    // so that was ~716 /_next/image URLs = 70 kB, a quarter of the page's
    // 289 kB of HTML. They gzip ~22:1 (near-identical strings), so this is
    // not a bandwidth problem - it is main-thread parse time, and TBT is 30%
    // of the mobile Lighthouse score. A video thumbnail never renders above
    // ~400 px CSS, so the top half of that ladder can never be chosen.
    deviceSizes: [640, 750, 828, 1080],
  },
};

export default withNextIntl(nextConfig);
