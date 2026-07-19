import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";

// Resolves the per-request locale + message catalog for BOTH server
// components (getTranslations) and the client provider. `requestLocale`
// comes from the middleware when it ran; routes outside the middleware's
// matcher (the untouched app/(legacy) group - /share-target, /c/[id]) never
// set it, so this falls back to the default locale, which is exactly what
// those English-only routes want.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.includes(requested as (typeof routing.locales)[number])
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
