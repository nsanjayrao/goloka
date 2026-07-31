"use client"; // per-visitor by nature - reads this device's history and, when
// signed in, the account's.

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { CategoryRow } from "@/components/category-row";
import { FadeUp } from "@/components/fade-up";
import { historyEntryToVideo } from "@/lib/recently-watched";
import { useWatchHistory } from "@/lib/watch-history";

export function ContinueWatchingShelf() {
  const t = useTranslations("home");
  // One hook, both halves: this device's localStorage history unioned with the
  // account's, newest per video. It also performs the one-time sign-in merge -
  // see lib/watch-history.ts.
  const history = useWatchHistory();
  const videos = useMemo(() => history.map(historyEntryToVideo), [history]);

  // Rendering nothing at all (not even the FadeUp wrapper) when empty matters:
  // the home page lays sections out with `flex gap-10`, so a wrapper with null
  // children would still count as a flex item and leave an empty gap - the
  // common case for a first-time visitor with no history yet.
  if (videos.length === 0) return null;
  return (
    <FadeUp>
      <CategoryRow title={t("continueWatching")} videos={videos} />
    </FadeUp>
  );
}
