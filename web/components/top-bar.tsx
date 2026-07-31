"use client"; // the glassy header needs the browser's scroll position:
// transparent gradient at the top of the page, gaining blur + a gold
// hairline after 40px (prototype behavior), and usePathname to mark the
// link you're currently on.

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/icons/logo-mark";
import { AccountControl } from "@/components/account-control";
import { MORE_HREFS, MoreSheet } from "@/components/more-sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Seven links plus a search pill used to compete for one row, which crowded
// badly between 600px and 1000px. Four primary destinations stay in the bar;
// the rest moved into the shared More sheet (2026-07-23). Order is by how
// often a devotee reaches for them, not alphabetically.
const PRIMARY_LINKS = [
  { href: "/browse", key: "browse" },
  { href: "/chant", key: "chant" },
  { href: "/calendar", key: "calendar" },
  { href: "/library", key: "library" },
] as const;

// Fixed midnight header (DESIGN.md #6): lotus wordmark in Marcellus,
// uppercase nav links (hidden under 600px - the bottom tab bar covers
// mobile), and the search pill linking to /search. Styles live in
// globals.css (.site-header etc.), ported from the prototype. `Link` comes
// from i18n/navigation (not next/link) so every nav href automatically
// carries the current locale's prefix (or none, for English).
export function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tLandmarks = useTranslations("landmarks");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll(); // a page can load already scrolled (e.g. back navigation)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The header previously gave no clue where you were - aria-current existed
  // only on the mobile tab bar, so on desktop every link looked identical no
  // matter which page you were reading.
  const onMorePage = MORE_HREFS.some((href) => pathname.startsWith(href));

  return (
    <header className={scrolled ? "site-header scrolled" : "site-header"}>
      <Link href="/" className="wordmark">
        <LogoMark className="size-7" />
        Goloka
      </Link>
      <nav className="site-nav" aria-label={tLandmarks("main")}>
        {PRIMARY_LINKS.map(({ href, key }) => {
          const here = pathname.startsWith(href);
          return (
            <Link
              key={href}
              className={cn("nav-link", here && "is-here")}
              href={href}
              aria-current={here ? "page" : undefined}
            >
              {t(key)}
            </Link>
          );
        })}

        <MoreSheet className={cn("nav-link nav-more", onMorePage && "is-here")}>
          {t("more")}
          <svg viewBox="0 0 10 6" aria-hidden="true">
            <path
              d="M1 1l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </MoreSheet>

        <Link className="search-pill" href="/search" aria-label={t("searchAria")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          {t("search")}
        </Link>

        {/* Sits OUTSIDE the .nav-link family on purpose: those hide under
            40rem, and the one thing that must never be unreachable on a phone
            is the way back into your own account. */}
        <AccountControl />
      </nav>
    </header>
  );
}
