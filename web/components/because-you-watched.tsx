"use client"; // personal by nature: the affinity comes from the visitor's
// own on-device watch history (lib/recently-watched.ts + lib/affinity.ts),
// so this can only ever render in the browser.

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { CategoryRow } from "@/components/category-row";
import { FadeUp } from "@/components/fade-up";
import { topCategories, watchedIds } from "@/lib/affinity";
import { fetchShelves } from "@/lib/shelves";
import {
  getRecentlyWatchedServerSnapshot,
  getRecentlyWatchedSnapshot,
  parseRecentlyWatchedSnapshot,
  subscribeToRecentlyWatched,
} from "@/lib/recently-watched";
import type { Video } from "@/lib/types";

// "Because you watched X" - the free-tier-honest recommendation shelf. The
// visitor's top one or two categories are computed ON-DEVICE from watch
// history, and only those category NAMES are sent to /api/shelves; the
// history itself never leaves the browser, and the already-watched videos are
// filtered out here after the response arrives. New visitors have no affinity,
// so the shelf simply doesn't exist for them - and it is deliberately capped
// at two quiet rows: a gift laid out, never an endless feed pulling at the
// sleeve.
//
// MAX_SHELVES is mirrored by MAX_CATEGORIES in app/api/shelves/route.ts, which
// clamps it server-side too - the browser is not trusted to bound the query.
// How many videos are fetched per row lives there as well (ROW_FETCH),
// deliberately a few more than ROW_SIZE so the filtering below still leaves a
// full row.
const MAX_SHELVES = 2;
const ROW_SIZE = 8;

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

  // ONE request for both categories now, through /api/shelves, instead of one
  // Supabase query per category straight from the browser. The already-watched
  // filtering stays HERE, on the device: the server is told which categories
  // to fetch, never which videos have been seen.
  useEffect(() => {
    const entries = parseRecentlyWatchedSnapshot(raw);
    const affinities = topCategories(entries, MAX_SHELVES);
    if (affinities.length === 0) return;
    const seen = watchedIds(entries);
    const controller = new AbortController();

    fetchShelves({ categories: affinities.map((a) => a.category) }, controller.signal).then(
      ({ categories }) => {
        if (controller.signal.aborted) return;
        setShelves(
          categories.map(({ category, videos }) => ({
            category,
            videos: videos.filter((v) => !seen.has(v.youtube_video_id)).slice(0, ROW_SIZE),
          }))
        );
      }
    );
    return () => controller.abort();
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
