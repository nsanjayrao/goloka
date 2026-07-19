import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Topic } from "@/lib/topics";

// Topic chip row for a channel page: lets a devotee narrow one trusted
// channel down to a theme they already follow it for - "Radhanath Swami on
// The Holy Name" - without leaving the channel. Same plain-link,
// server-rendered pattern as FilterChips (DESIGN.md's "server components for
// initial data" rule): a chip sets/clears the `?topic=` query param and the
// server re-renders filtered - no client state needed.
export function TopicChips({
  handle,
  topics,
  activeSlug,
}: {
  /** The already-encoded route segment (see [handle]/page.tsx), so links
   * built here match the page's own canonical path exactly. */
  handle: string;
  topics: Topic[];
  activeSlug?: string;
}) {
  const t = useTranslations("topicChips");
  const basePath = `/channel/${handle}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-text-muted">{t("on")}</span>
      {topics.map((topic) => {
        const active = activeSlug === topic.slug;
        return (
          <Link
            key={topic.slug}
            // Clicking the active chip clears the filter (toggle); any other
            // chip replaces it outright - a channel page only ever filters
            // by one topic at a time.
            href={active ? basePath : `${basePath}?topic=${topic.slug}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-200 ease-out",
              active
                ? "border-accent bg-surface-2 text-accent-strong"
                : "border-border bg-surface text-text-muted hover:text-text"
            )}
          >
            {topic.title}
          </Link>
        );
      })}
    </div>
  );
}
