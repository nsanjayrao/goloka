"use client"; // reads localStorage (lib/recently-watched.ts) - inherently
// client-only, and per-visitor, so it can't be server-rendered.

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { CategoryRow } from "@/components/category-row";
import { FadeUp } from "@/components/fade-up";
import { useSession } from "@/lib/auth";
import {
  getRecentlyWatchedServerSnapshot,
  getRecentlyWatchedSnapshot,
  parseRecentlyWatchedSnapshot,
  subscribeToRecentlyWatched,
  type RecentlyWatchedEntry,
} from "@/lib/recently-watched";
import type { Video } from "@/lib/types";
import { getRemoteHistory, mergeLocalHistory } from "@/lib/watch-history";

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
  const t = useTranslations("home");
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
  const local = useMemo(() => parseRecentlyWatchedSnapshot(raw), [raw]);

  const { session } = useSession();
  const userId = session?.user.id ?? null;
  // Keyed by the user it was fetched FOR, not a bare array - the same idiom
  // LanguageShelf uses. Signing out then needs no reset-in-effect (which the
  // react-hooks lint rightly rejects): `remoteEntries` below simply stops
  // matching and falls back to an empty list.
  const [remote, setRemote] = useState<{ userId: string; entries: RecentlyWatchedEntry[] } | null>(
    null
  );
  // One merge per signed-in devotee. Without it, someone who used Goloka
  // anonymously for months would sign in and watch their history apparently
  // vanish - the account would be empty until they watched something new.
  const merged = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      if (merged.current !== userId) {
        merged.current = userId;
        await mergeLocalHistory(userId, local);
      }
      const entries = await getRemoteHistory(userId);
      if (!cancelled) setRemote({ userId, entries });
    })();
    return () => {
      cancelled = true;
    };
    // `local` is deliberately NOT a dependency: it changes on every watch, and
    // re-running the merge on each one would be pointless write traffic. The
    // merge is a one-time reconciliation at sign-in; ongoing watches are
    // recorded by RecordWatch on both sides already.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // The device and the account are both real histories - a devotee may have
  // watched on a laptop this morning and on this phone last night. Union
  // them, keep the newer timestamp per video, and show the most recent.
  const videos = useMemo(() => {
    // Resolved inside the memo: as a bare `const` above it, the `: []` branch
    // built a fresh array every render and the memo could never hold.
    const remoteEntries = userId && remote?.userId === userId ? remote.entries : [];
    const byId = new Map<string, RecentlyWatchedEntry>();
    for (const entry of [...local, ...remoteEntries]) {
      const seen = byId.get(entry.youtube_video_id);
      if (!seen || entry.watched_at > seen.watched_at) byId.set(entry.youtube_video_id, entry);
    }
    return [...byId.values()]
      .sort((a, b) => b.watched_at - a.watched_at)
      .slice(0, 12)
      .map(toVideoShape);
  }, [local, remote, userId]);

  // Rendering nothing at all (not even the FadeUp/motion.div wrapper) when
  // empty matters here: the home page lays sections out with `flex gap-10`,
  // so a wrapper div with null children would still count as a flex item
  // and leave an empty gap - the common case for a first-time visitor or
  // anyone without watch history yet.
  if (videos.length === 0) return null;
  return (
    <FadeUp>
      <CategoryRow title={t("continueWatching")} videos={videos} />
    </FadeUp>
  );
}
