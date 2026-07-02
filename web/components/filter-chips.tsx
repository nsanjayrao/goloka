import Link from "next/link";

import { cn } from "@/lib/utils";
import type { DurationBucket } from "@/lib/types";

const DURATION_OPTIONS: { value: DurationBucket; label: string }[] = [
  { value: "short", label: "<15m" },
  { value: "medium", label: "15–45m" },
  { value: "long", label: ">45m" },
];

// Filter chips are plain links that set/clear URL search params - clicking
// one navigates to a new URL and the server re-renders the filtered page.
// No client-side state needed (DESIGN.md's "server components for initial
// data, client components only where interactivity requires it").
export function FilterChips({
  category,
  channels,
  activeChannelId,
  activeDuration,
}: {
  category: string;
  channels: { id: number; title: string }[];
  activeChannelId?: number;
  activeDuration?: DurationBucket;
}) {
  const basePath = `/browse/${encodeURIComponent(category)}`;

  function hrefFor(next: { channel?: number; duration?: DurationBucket }) {
    const params = new URLSearchParams();
    if (next.channel) params.set("channel", String(next.channel));
    if (next.duration) params.set("duration", next.duration);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((channel) => {
        const active = activeChannelId === channel.id;
        return (
          <Link
            key={channel.id}
            href={hrefFor({ channel: active ? undefined : channel.id, duration: activeDuration })}
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
            href={hrefFor({ channel: activeChannelId, duration: active ? undefined : option.value })}
            className={chipClass(active)}
          >
            {option.label}
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
      ? "border-accent bg-surface-2 text-accent"
      : "border-border bg-surface text-text-muted hover:text-text"
  );
}
