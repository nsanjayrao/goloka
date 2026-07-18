import type { NextConfig } from "next";

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
    // the image is the page's LCP element on mobile).
    qualities: [50, 75],
  },
};

export default nextConfig;
