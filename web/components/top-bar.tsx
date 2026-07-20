"use client"; // the glassy header needs the browser's scroll position:
// transparent gradient at the top of the page, gaining blur + a gold
// hairline after 40px (prototype behavior). Everything else is static.

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/icons/logo-mark";
import { Link } from "@/i18n/navigation";

// Fixed midnight header (DESIGN.md #6): lotus wordmark in Marcellus,
// uppercase nav links (hidden under 600px - the bottom tab bar covers
// mobile), and the search pill linking to /search. Styles live in
// globals.css (.site-header etc.), ported from the prototype. `Link` comes
// from i18n/navigation (not next/link) so every nav href automatically
// carries the current locale's prefix (or none, for English).
export function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations("nav");
  const tLandmarks = useTranslations("landmarks");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll(); // a page can load already scrolled (e.g. back navigation)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "site-header scrolled" : "site-header"}>
      <Link href="/" className="wordmark">
        <LogoMark className="size-7" />
        Goloka
      </Link>
      <nav className="site-nav" aria-label={tLandmarks("main")}>
        <Link className="nav-link" href="/chant">
          {t("chant")}
        </Link>
        <Link className="nav-link" href="/calendar">
          {t("calendar")}
        </Link>
        <Link className="nav-link" href="/browse">
          {t("browse")}
        </Link>
        <Link className="nav-link" href="/leaders">
          {t("leaders")}
        </Link>
        <Link className="nav-link" href="/books">
          {t("books")}
        </Link>
        <Link className="nav-link" href="/temples">
          {t("temples")}
        </Link>
        <Link className="nav-link" href="/library">
          {t("library")}
        </Link>
        <Link className="search-pill" href="/search" aria-label={t("searchAria")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          {t("search")}
        </Link>
      </nav>
    </header>
  );
}
