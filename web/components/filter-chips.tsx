import Link from "next/link";

import { cn } from "@/lib/utils";
import type { DurationBucket } from "@/lib/types";

type SortOption = "recent" | "popular";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "popular", label: "Most watched" },
];

const DURATION_OPTIONS: { value: DurationBucket; label: string }[] = [
  { value: "short", label: "<15m" },
  { value: "medium", label: "15–45m" },
  { value: "long", label: ">45m" },
];

// Filter/sort chips are plain links that set/clear URL search params - clicking
// one navigates to a new URL and the server re-renders the page in the new
// order/filter. No client-side state needed (DESIGN.md's "server components for
// initial data, client components only where interactivity requires it").
export function FilterChips({
  category,
  channels,
  languages,
  activeChannelId,
  activeDuration,
  activeLanguage,
  activeSort = "recent",
}: {
  category: string;
  channels: { id: number; title: string }[];
  /** Languages present in this category (lib/data.ts's getLanguagesInCategory) -
   * omitted (empty array) until the worker's Groq classification has
   * populated `language` for enough videos to be worth a filter row. */
  languages: string[];
  activeChannelId?: number;
  activeDuration?: DurationBucket;
  activeLanguage?: string;
  activeSort?: SortOption;
}) {
  const basePath = `/browse/${encodeURIComponent(category)}`;

  // Build a URL from the FULL next filter state, so changing one chip never
  // silently drops the others. "recent" is the default, so it's left out of
  // the query to keep the canonical URL clean.
  function hrefFor(next: {
    channel?: number;
    duration?: DurationBucket;
    language?: string;
    sort: SortOption;
  }) {
    const params = new URLSearchParams();
    if (next.channel) params.set("channel", String(next.channel));
    if (next.duration) params.set("duration", next.duration);
    if (next.language) params.set("language", next.language);
    if (next.sort !== "recent") params.set("sort", next.sort);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {SORT_OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={hrefFor({
            channel: activeChannelId,
            duration: activeDuration,
            language: activeLanguage,
            sort: option.value,
          })}
          className={chipClass(activeSort === option.value)}
        >
          {option.label}
        </Link>
      ))}
      {channels.map((channel) => {
        const active = activeChannelId === channel.id;
        return (
          <Link
            key={channel.id}
            href={hrefFor({
              channel: active ? undefined : channel.id,
              duration: activeDuration,
              language: activeLanguage,
              sort: activeSort,
            })}
            className={chipClass(active)}
          >
            {channel.title}
          </Link>
        );
      })}
      {DURATION_OPTIONS.map((option) => {
        const active = activeDuration === option.value;
        return (
          <Link
            key={option.value}
            href={hrefFor({
              channel: activeChannelId,
              duration: active ? undefined : option.value,
              language: activeLanguage,
              sort: activeSort,
            })}
            className={chipClass(active)}
          >
            {option.label}
          </Link>
        );
      })}
      {languages.map((language) => {
        const active = activeLanguage === language;
        return (
          <Link
            key={language}
            href={hrefFor({
              channel: activeChannelId,
              duration: activeDuration,
              language: active ? undefined : language,
              sort: activeSort,
            })}
            className={chipClass(active)}
          >
            {language}
          </Link>
        );
      })}
    </div>
  );
}

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-200 ease-out",
    active
      ? "border-accent bg-surface-2 text-accent-strong"
      : "border-border bg-surface text-text-muted hover:text-text"
  );
}
