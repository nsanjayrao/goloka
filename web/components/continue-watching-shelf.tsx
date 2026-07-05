"use client"; // reads localStorage (lib/recently-watched.ts) - inherently
// client-only, and per-visitor, so it can't be server-rendered.

import { useMemo, useSyncExternalStore } from "react";

import { CategoryRow } from "@/components/category-row";
import { FadeUp } from "@/components/fade-up";
import {
  getRecentlyWatchedServerSnapshot,
  getRecentlyWatchedSnapshot,
  parseRecentlyWatchedSnapshot,
  subscribeToRecentlyWatched,
  type RecentlyWatchedEntry,
} from "@/lib/recently-watched";
import type { Video } from "@/lib/types";

// VideoCard (via CategoryRow) only ever reads title, duration_seconds,
// thumbnail_url, youtube_video_id, channel?.title, published_at and
// view_count - so a placeholder Video with fabricated values for the OTHER
// fields (id, category, tags, ...) renders correctly without a second card
// component to maintain. published_at/view_count are left null: showing a
// fake date or view count would be dishonest, so the card just omits them.
function toVideoShape(entry: RecentlyWatchedEntry): Video {
  return {
    id: 0,
    channel_id: 0,
    category: "",
    language: null,
    tags: [],
    featured: false,
    created_at: "",
    description: null,
    published_at: null,
    view_count: null,
    youtube_video_id: entry.youtube_video_id,
    title: entry.title,
    thumbnail_url: entry.thumbnail_url,
    duration_seconds: entry.duration_seconds,
    channel: entry.channel_title ? { title: entry.channel_title, handle: null, thumbnail_url: null } : null,
  };
}

export function ContinueWatchingShelf() {
  // useSyncExternalStore (not useEffect+useState): this reads an external
  // store (localStorage), and the snapshot is the raw string so repeated
  // calls compare equal via Object.is when nothing changed - the server
  // snapshot ("") matches a visitor with no history yet, so hydration never
  // mismatches.
  const raw = useSyncExternalStore(
    subscribeToRecentlyWatched,
    getRecentlyWatchedSnapshot,
    getRecentlyWatchedServerSnapshot
  );
  const videos = useMemo(() => parseRecentlyWatchedSnapshot(raw).map(toVideoShape), [raw]);

  // Rendering nothing at all (not even the FadeUp/motion.div wrapper) when
  // empty matters here: the home page lays sections out with `flex gap-10`,
  // so a wrapper div with null children would still count as a flex item
  // and leave an empty gap - the common case for a first-time visitor or
  // anyone without watch history yet.
  if (videos.length === 0) return null;
  return (
    <FadeUp>
      <CategoryRow title="Continue Watching" videos={videos} />
    </FadeUp>
  );
}
