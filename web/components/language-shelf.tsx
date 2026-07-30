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
import { fetchShelves } from "@/lib/shelves";
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

  // Goes through /api/shelves rather than querying Supabase from the browser,
  // so the SDK stays off this page's bundle and the response can be cached at
  // the edge (a language shelf is identical for everyone who picked that
  // language). AbortController: switching the preference mid-fetch must not
  // let a stale response overwrite the newer selection.
  useEffect(() => {
    if (!preference) return;
    const controller = new AbortController();
    fetchShelves({ language: preference }, controller.signal).then(({ language }) => {
      if (controller.signal.aborted || !language) return;
      setResult({ language: language.language, videos: language.videos });
    });
    return () => controller.abort();
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
