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
  },
};

export default nextConfig;
