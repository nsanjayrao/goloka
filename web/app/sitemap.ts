import type { MetadataRoute } from "next";

import { getAllCategories, getChannelHandles, getSeriesHandles, getSitemapVideos } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { TOPIC_LIST } from "@/lib/topics";

// Regenerate hourly so newly synced videos/categories/channels/series enter
// the sitemap without a redeploy. All data calls go through `safely`, so an
// unreachable DB yields just the static + topic routes rather than a build
// error.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, handles, seriesIds, videos] = await Promise.all([
    getAllCategories(),
    getChannelHandles(),
    getSeriesHandles(),
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

  // Topic collections (/topic/<slug>) are a small, fixed, hand-curated list
  // (lib/topics.ts) - no DB call needed, unlike categories/channels/series.
  const topicRoutes: MetadataRoute.Sitemap = TOPIC_LIST.map((topic) => ({
    url: `${SITE_URL}/topic/${topic.slug}`,
    changeFrequency: "weekly",
  }));

  const seriesRoutes: MetadataRoute.Sitemap = seriesIds.map((id) => ({
    url: `${SITE_URL}/series/${id}`,
    changeFrequency: "weekly",
  }));

  const videoRoutes: MetadataRoute.Sitemap = videos.map((video) => ({
    url: `${SITE_URL}/watch/${video.youtube_video_id}`,
    lastModified: video.published_at ?? undefined,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...channelRoutes,
    ...topicRoutes,
    ...seriesRoutes,
    ...videoRoutes,
  ];
}
