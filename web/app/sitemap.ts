import type { MetadataRoute } from "next";

import { getAllCategories, getChannelHandles, getSitemapVideos } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Regenerate hourly so newly synced videos/categories/channels enter the
// sitemap without a redeploy. All three data calls go through `safely`, so
// an unreachable DB yields just the static routes rather than a build error.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, handles, videos] = await Promise.all([
    getAllCategories(),
    getChannelHandles(),
    getSitemapVideos(500),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = ["", "/browse", "/search", "/leaders", "/books", "/temples"].map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "daily",
    })
  );

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/browse/${encodeURIComponent(category)}`,
    changeFrequency: "daily",
  }));

  const channelRoutes: MetadataRoute.Sitemap = handles.map((handle) => ({
    url: `${SITE_URL}/channel/${encodeURIComponent(handle)}`,
    changeFrequency: "weekly",
  }));

  const videoRoutes: MetadataRoute.Sitemap = videos.map((video) => ({
    url: `${SITE_URL}/watch/${video.youtube_video_id}`,
    lastModified: video.published_at ?? undefined,
  }));

  return [...staticRoutes, ...categoryRoutes, ...channelRoutes, ...videoRoutes];
}
