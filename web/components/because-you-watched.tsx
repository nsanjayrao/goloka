"use client"; // personal by nature: the affinity comes from the visitor's
// own on-device watch history (lib/recently-watched.ts + lib/affinity.ts),
// so this can only ever render in the browser.

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { CategoryRow } from "@/components/category-row";
import { FadeUp } from "@/components/fade-up";
import { topCategories, watchedIds } from "@/lib/affinity";
import { getVideosByCategory } from "@/lib/data";
import {
  getRecentlyWatchedServerSnapshot,
  getRecentlyWatchedSnapshot,
  parseRecentlyWatchedSnapshot,
  subscribeToRecentlyWatched,
} from "@/lib/recently-watched";
import type { Video } from "@/lib/types";

// "Because you watched X" - the free-tier-honest recommendation shelf. The
// visitor's top one or two categories (computed on-device, never sent
// anywhere) each fetch ONE bounded query through lib/data.ts, minus the
// videos they've already seen. New visitors have no affinity, so the shelf
// simply doesn't exist for them - and it is deliberately capped at two
// quiet rows: a gift laid out, never an endless feed pulling at the sleeve.
const MAX_SHELVES = 2;
const ROW_SIZE = 8;
// Fetch a few more than the row shows so filtering out already-watched
// videos still leaves a full row.
const FETCH_SIZE = 12;

type Shelf = { category: string; videos: Video[] };

export function BecauseYouWatched() {
  const t = useTranslations("home");
  // Server snapshot "" = no history = renders nothing, so SSR and the first
  // client render agree; the real history arrives with the client snapshot.
  const raw = useSyncExternalStore(
    subscribeToRecentlyWatched,
    getRecentlyWatchedSnapshot,
    getRecentlyWatchedServerSnapshot
  );
  const [shelves, setShelves] = useState<Shelf[] | null>(null);

  useEffect(() => {
    const entries = parseRecentlyWatchedSnapshot(raw);
    const affinities = topCategories(entries, MAX_SHELVES);
    if (affinities.length === 0) return;
    const seen = watchedIds(entries);
    let cancelled = false;
    Promise.all(affinities.map((a) => getVideosByCategory(a.category, FETCH_SIZE))).then((lists) => {
      if (cancelled) return;
      setShelves(
        affinities.map((a, i) => ({
          category: a.category,
          videos: lists[i].filter((v) => !seen.has(v.youtube_video_id)).slice(0, ROW_SIZE),
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [raw]);

  const visible = (shelves ?? []).filter((s) => s.videos.length > 0);
  // Nothing (not even a wrapper) when there's nothing to offer - same
  // reasoning as ContinueWatchingShelf: an empty flex item still gaps.
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((shelf) => (
        <FadeUp key={shelf.category}>
          <CategoryRow
            category={shelf.category}
            kicker={t("forYou")}
            title={t("becauseYouWatched", { category: shelf.category })}
            videos={shelf.videos}
          />
        </FadeUp>
      ))}
    </>
  );
}
