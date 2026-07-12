"use client"; // the glassy header needs the browser's scroll position:
// transparent gradient at the top of the page, gaining blur + a gold
// hairline after 40px (prototype behavior). Everything else is static.

import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/icons/logo-mark";

// Fixed midnight header (DESIGN.md #6): lotus wordmark in Marcellus,
// uppercase nav links (hidden under 600px - the bottom tab bar covers
// mobile), and the search pill linking to /search. Styles live in
// globals.css (.site-header etc.), ported from the prototype.
export function TopBar() {
  const [scrolled, setScrolled] = useState(false);

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
      <nav className="site-nav" aria-label="Main">
        <Link className="nav-link" href="/browse">
          Browse
        </Link>
        <Link className="nav-link" href="/leaders">
          Leaders
        </Link>
        <Link className="search-pill" href="/search" aria-label="Search Goloka">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          Search
        </Link>
      </nav>
    </header>
  );
}
