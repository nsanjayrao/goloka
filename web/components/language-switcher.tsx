"use client"; // needs the current URL (usePathname) and the active locale
// (useLocale) to build "this same page, in each other language" links.

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_LABELS, routing } from "@/i18n/routing";

// The footer language row (goal #6): a small globe/locale line, native
// names only (हिन्दी stays हिन्दी regardless of which locale is showing),
// each linking to the SAME page in that locale. `usePathname` here is
// next-intl's locale-stripped pathname, and next-intl's `Link` accepts a
// `locale` override that re-prefixes that exact path - so this works
// identically on a dynamic page (/watch/[id], /browse/[category]) as on a
// static one, with no per-route mapping to maintain.
export function LanguageSwitcher() {
  const pathname = usePathname();
  const activeLocale = useLocale();
  const t = useTranslations("landmarks");

  return (
    <nav aria-label={t("language")} className="lang-switcher">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="lang-globe">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === activeLocale ? "true" : undefined}
          className={locale === activeLocale ? "lang-link active" : "lang-link"}
        >
          {LOCALE_LABELS[locale]}
        </Link>
      ))}
    </nav>
  );
}
