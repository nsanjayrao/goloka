"use client"; // instant-as-you-type search needs browser state (the query,
// debounce timer, results, and localStorage recent searches).

import { Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { EmptyState } from "@/components/empty-state";
import { VideoCard } from "@/components/video-card";
import { VideoCardSkeleton } from "@/components/video-card-skeleton";
import { searchVideos } from "@/lib/data";
import {
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  parseRecentSearches,
  recordSearch,
  subscribeToRecentSearches,
} from "@/lib/recent-searches";
import type { Video } from "@/lib/types";

const GRID_CLASSES =
  "grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

// A short, curated set of go-to searches (topics + common terms). Static and
// tiny - a real "trending" system would need query logging the site doesn't do.
const POPULAR_SEARCHES = [
  "Krishna",
  "Radharani",
  "Vrindavan",
  "Bhagavad Gita",
  "Kirtan",
  "Janmashtami",
  "Prabhupada",
];

function QueryChip({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] text-text-muted shadow-card outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
    >
      {label}
    </button>
  );
}

export function SearchClient({
  categories,
  latestVideos,
}: {
  categories: string[];
  latestVideos: Video[];
}) {
  const urlQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // Adopt a new ?q= if the top bar navigates here while this page is open.
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    if (urlQuery) setQuery(urlQuery);
  }

  const [videos, setVideos] = useState<Video[]>([]);
  const [videosForQuery, setVideosForQuery] = useState("");
  const trimmedQuery = query.trim();
  const isPending = trimmedQuery !== "" && trimmedQuery !== videosForQuery;

  // Recent searches live in localStorage; read reactively so a just-recorded
  // search shows up immediately.
  const recentRaw = useSyncExternalStore(
    subscribeToRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot
  );
  const recent = useMemo(() => parseRecentSearches(recentRaw), [recentRaw]);

  useEffect(() => {
    if (!trimmedQuery) return;
    // Debounce: 300ms of no typing before querying.
    const timer = setTimeout(async () => {
      const results = await searchVideos(trimmedQuery);
      setVideos(results);
      setVideosForQuery(trimmedQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  const resting = !trimmedQuery;
  const noResults = !isPending && trimmedQuery !== "" && videos.length === 0;

  // Category chips navigate to /browse (a different action than searching),
  // so they stay Links; recent/popular chips set the query.
  const categoryChips =
    categories.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link
            key={category}
            href={`/browse/${encodeURIComponent(category)}`}
            className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] text-text-muted shadow-card transition-colors hover:text-text"
          >
            {category}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <div>
      {/* Floating glass search bar (DESIGN.md #4 Search): 44px, blur, rounded,
          hairline border, soft resting shadow, gold focus ring. Submitting
          (Enter) records the search. */}
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          recordSearch(trimmedQuery);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Blur fires when focus leaves the input - including when the
          // visitor clicks a result - so this records the query they actually
          // followed through on, without logging every partial keystroke.
          onBlur={() => recordSearch(trimmedQuery)}
          type="search"
          enterKeyHint="search"
          placeholder="Search lectures, kirtans, festivals…"
          aria-label="Search Goloka"
          className="h-11 w-full rounded-full border border-border bg-surface/70 pl-11 pr-4 text-[15px] text-text shadow-card outline-none backdrop-blur-md transition-shadow placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent"
        />
      </form>

      <div className="mt-8">
        {resting && (
          <div className="space-y-8">
            {recent.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-2xl font-medium tracking-tight text-text">Recent</h2>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[13px] text-text-muted outline-none transition-colors hover:text-accent-strong focus-visible:text-accent-strong"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((term) => (
                    <QueryChip key={term} label={term} onSelect={() => setQuery(term)} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 font-heading text-2xl font-medium tracking-tight text-text">Popular</h2>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <QueryChip key={term} label={term} onSelect={() => setQuery(term)} />
                ))}
              </div>
            </section>

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
