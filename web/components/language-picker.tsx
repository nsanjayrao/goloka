"use client"; // reads/writes the visitor's own content-language preference
// (lib/content-language.ts, localStorage) - inherently client-only.

import { useTranslations } from "next-intl";

import { LANGUAGE_OPTIONS, setContentLanguage, useContentLanguage } from "@/lib/content-language";
import { cn } from "@/lib/utils";

// A quiet, unobtrusive control - never a section of its own, no h2, no
// section-head. Same slim-band idiom as CalendarStrip (a --pad gutter row
// with a small uppercase label), and the same chip language as FilterChips,
// just a touch quieter (border-border/text-muted at rest) since this sits on
// the home page rather than a filtered browse grid. Selecting a language, or
// re-selecting the active one, is a toggle; "All" always clears. The option
// labels themselves (Hindi, Bengali, ...) are content-language names, not UI
// chrome, so they stay as lib/content-language.ts defines them.
export function LanguagePicker() {
  const preference = useContentLanguage();
  const t = useTranslations("languagePicker");

  function select(value: string | null) {
    if (value === null) {
      setContentLanguage(null);
      return;
    }
    setContentLanguage(preference === value ? null : value);
  }

  return (
    <div className="gutter flex flex-wrap items-center gap-2 py-4">
      <span className="mr-1 text-[12px] uppercase tracking-[0.22em] text-text-muted">{t("watchIn")}</span>
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={preference === option.value}
          onClick={() => select(option.value)}
          className={chipClass(preference === option.value)}
        >
          {option.label}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={preference === null}
        onClick={() => select(null)}
        className={chipClass(preference === null)}
      >
        {t("all")}
      </button>
    </div>
  );
}

function chipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-200 ease-out",
    active ? "border-accent/50 text-flame" : "border-border text-text-muted hover:text-text"
  );
}
