"use client"; // owns the "load more" state (which videos have been fetched
// so far) - that's client-only state, unlike the initial page which the
// server already rendered.

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { CATEGORY_PAGE_SIZE, getVideosPage, type VideoPageFilters } from "@/lib/data";
import type { Video } from "@/lib/types";

const GRID_CLASSES =
  "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

// The category grid + "Load more" button (DESIGN.md #4: "Load more" was
// chosen over infinite scroll - see the task spec's explicit "simpler"
// guidance). Renders the server-fetched first page, then fetches
// subsequent pages itself using the same filters.
export function VideoGrid({
  initialVideos,
  filters,
}: {
  initialVideos: Video[];
  filters: VideoPageFilters;
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialVideos.length === CATEGORY_PAGE_SIZE);

  async function loadMore() {
    setLoading(true);
    const next = await getVideosPage(filters, videos.length, CATEGORY_PAGE_SIZE);
    setVideos((prev) => [...prev, ...next]);
    setHasMore(next.length === CATEGORY_PAGE_SIZE);
    setLoading(false);
  }

  if (videos.length === 0) {
    return <EmptyState message="No videos match these filters yet — try a different one." />;
  }

  return (
    <div>
      <div className={GRID_CLASSES}>
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
