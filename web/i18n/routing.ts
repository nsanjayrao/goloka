import { defineRouting } from "next-intl/routing";

// The single source of truth for which locales exist and how the URL
// reflects them. `localePrefix: "as-needed"` is the load-bearing choice: the
// default locale ("en") gets NO prefix at all, so every existing English
// URL (/, /browse, /watch/[id], every share link already in the wild) keeps
// working byte-for-byte. Only the four translated locales are prefixed
// (/hi, /bn, /ru, /es).
export const routing = defineRouting({
  locales: ["en", "hi", "bn", "ru", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Never auto-redirect based on the browser's Accept-Language header.
  // Without this, next-intl's default detection would send a Hindi-browser
  // visitor from "/" to "/hi" on first load - exactly the URL instability
  // constraint 1 forbids. A locale is only ever entered explicitly (typing
  // /hi, or the footer switcher).
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

// Native display names for the footer language switcher (goal #6) - each
// language names itself, not translated through the UI (a devotee reading
// Russian should still see "हिन्दी", not a Cyrillic transliteration of it).
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  hi: "हिन्दी",
  bn: "বাংলা",
  ru: "Русский",
  es: "Español",
};
