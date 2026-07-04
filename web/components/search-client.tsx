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

export function SearchClient({
  categories,
  latestVideos,
}: {
  categories: string[];
  latestVideos: Video[];
}) {
  // Supports arriving here from the top bar's search box (which navigates
  // to /search?q=...).
  const urlQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // useState only reads urlQuery on first mount. If the top bar navigates
  // to /search?q=... while this page is already open, the URL changes but
  // not our state - without this sync, search looks dead. This is React's
  // "adjust state during render" pattern: we remember the last URL query we
  // saw, and when it changes, adopt it as the input value mid-render
  // (allowed and cheaper than doing the same from a useEffect).
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    if (urlQuery) setQuery(urlQuery);
  }
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

  // Three mutually exclusive states below the input: the resting state
  // (no query yet), the no-results state, and the results grid.
  const resting = !trimmedQuery;
  const noResults = !isPending && trimmedQuery !== "" && videos.length === 0;

  // Category suggestion chips - shown both in the resting state and under
  // the no-results message, so it's a shared element.
  const categoryChips =
    categories.length > 0 ? (
      <div className="flex flex-wrap gap-2">
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
    ) : null;

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
        {resting && (
          <div className="space-y-10">
            {categoryChips && (
              <section>
                <h2 className="mb-3 font-heading text-2xl font-medium tracking-tight text-text">
                  Browse by category
                </h2>
                {categoryChips}
              </section>
            )}
            {latestVideos.length > 0 && (
              <section>
                <h2 className="mb-4 font-heading text-2xl font-medium tracking-tight text-text">
                  Newest additions
                </h2>
                <div className={GRID_CLASSES}>
                  {latestVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {isPending && (
          <div className={GRID_CLASSES}>
            {Array.from({ length: 10 }).map((_, index) => (
              <VideoCardSkeleton key={index} />
            ))}
          </div>
        )}

        {noResults && (
          <EmptyState message="Nothing here yet — like Vrindavan before the festival. Try another search.">
            {categoryChips && <div className="flex justify-center">{categoryChips}</div>}
          </EmptyState>
        )}

        {!isPending && trimmedQuery !== "" && videos.length > 0 && (
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
