"use client"; // instant-as-you-type search needs browser state (the query,
// debounce timer, and results) - this is the one page that's client-driven
// end to end per the task spec.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { VideoCardSkeleton } from "@/components/video-card-skeleton";
import { searchVideos } from "@/lib/data";
import type { Video } from "@/lib/types";

const GRID_CLASSES =
  "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export function SearchClient({ categories }: { categories: string[] }) {
  // Supports arriving here from the top bar's search box (which navigates
  // to /search?q=...).
  const initialQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [videos, setVideos] = useState<Video[]>([]);
  // The query string `videos` is actually the results for. While the user
  // is still typing (or the debounce is pending), this lags behind `query`
  // - that's what tells us to show a skeleton instead of stale results.
  const [videosForQuery, setVideosForQuery] = useState("");
  const trimmedQuery = query.trim();
  const isPending = trimmedQuery !== "" && trimmedQuery !== videosForQuery;

  useEffect(() => {
    if (!trimmedQuery) return;

    // Debounce: wait 300ms of no typing before actually querying Supabase.
    const timer = setTimeout(async () => {
      const results = await searchVideos(trimmedQuery);
      setVideos(results);
      setVideosForQuery(trimmedQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  let emptyMessage: string | null = null;
  if (!trimmedQuery) {
    emptyMessage = "Search for a lecture, kirtan, or festival by title.";
  } else if (!isPending && videos.length === 0) {
    emptyMessage = "Nothing here yet — like Vrindavan before the festival. Try another search.";
  }

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        placeholder="Search lectures, kirtans, festivals…"
        aria-label="Search Goloka"
        className="w-full rounded-full border border-border bg-surface px-5 py-3 text-[15px] text-text outline-none placeholder:text-text-muted focus:border-accent"
      />

      <div className="mt-8">
        {isPending && (
          <div className={GRID_CLASSES}>
            {Array.from({ length: 10 }).map((_, index) => (
              <VideoCardSkeleton key={index} />
            ))}
          </div>
        )}

        {emptyMessage && (
          <EmptyState message={emptyMessage}>
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={`/browse/${encodeURIComponent(category)}`}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-text-muted transition-colors hover:text-text"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            )}
          </EmptyState>
        )}

        {!isPending && trimmedQuery && videos.length > 0 && (
          <div className={GRID_CLASSES}>
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
