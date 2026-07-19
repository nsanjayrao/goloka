"use client"; // reads localStorage (lib/content-language.ts) and fetches
// per-language videos client-side - the home page is ISR-cached and
// identical for every visitor, so a per-visitor language preference can
// never fork the server render. This shelf, like ContinueWatchingShelf,
// materializes after mount for whoever has a preference set; everyone else
// (the common case, and the server render itself) sees just the picker.

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CategoryRow } from "@/components/category-row";
import { FadeUp } from "@/components/fade-up";
import { LanguagePicker } from "@/components/language-picker";
import { getVideosPage } from "@/lib/data";
import { LANGUAGE_OPTIONS, useContentLanguage } from "@/lib/content-language";
import type { Video } from "@/lib/types";

export function LanguageShelf() {
  const preference = useContentLanguage();
  const t = useTranslations("home");

  // Keyed by the language it was fetched for, not just a bare Video[]: that
  // way clearing the preference (or switching it) needs no synchronous
  // setState in the effect body (react-hooks/set-state-in-effect) - `videos`
  // below simply stops matching the stale result and falls back to [].
  const [result, setResult] = useState<{ language: string; videos: Video[] } | null>(null);

  // getVideosPage (lib/data.ts) reads with the anon key and is safe to call
  // from the browser - same query the /browse language filter chips use.
  // Cancelled-flag guard: switching the preference mid-fetch must not let a
  // stale response overwrite the newer selection.
  useEffect(() => {
    if (!preference) return;
    let cancelled = false;
    getVideosPage({ language: preference }, 0, 12).then((videos) => {
      if (!cancelled) setResult({ language: preference, videos });
    });
    return () => {
      cancelled = true;
    };
  }, [preference]);

  const videos = preference && result?.language === preference ? result.videos : [];
  const nativeLabel = LANGUAGE_OPTIONS.find((option) => option.value === preference)?.label ?? preference;

  return (
    <>
      {/* No preference set, or the preferred language simply has no videos
          yet (thin catalog, not an error): only the picker renders, never an
          empty CategoryRow wrapper - same "render nothing" rationale as
          ContinueWatchingShelf, so the home page's `flex gap-10` layout
          doesn't leave a gap where the row would have been. */}
      {preference && videos.length > 0 && (
        <FadeUp>
          <CategoryRow kicker={t("inYourLanguage")} title={nativeLabel ?? preference} videos={videos} />
        </FadeUp>
      )}
      <LanguagePicker />
    </>
  );
}
