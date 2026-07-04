import { Search } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/container";
import { LogoMark } from "@/components/icons/logo-mark";
import { TopBarSearch } from "@/components/top-bar-search";

// Apple-TV black header (DESIGN.md #4, owner decision 2026-07-03): one
// persistent near-black translucent bar with white text on every page and
// at every scroll position - tv.apple.com's global nav. The old
// transparent-over-hero-then-frosted switching is gone, which also let
// this go back to being a plain server component (no pathname check, no
// IntersectionObserver).
export function TopBar() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur"
      // The page's tokens are near-black-on-white, which would vanish on a
      // black bar. Every child (logo, search pill, icons) styles itself
      // with the tokens, so locally overriding the CSS variables here
      // re-skins the whole bar to white tones in one place (DESIGN.md #2).
      style={
        {
          "--bg": "#000000",
          "--text": "#ffffff",
          "--text-muted": "rgba(255,255,255,0.75)",
          "--accent": "#f0a83c",
          "--surface": "rgba(255,255,255,0.18)",
          "--border": "rgba(255,255,255,0.35)",
        } as React.CSSProperties
      }
    >
      <Container className="flex h-14 items-center justify-between gap-4 sm:h-16">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-heading text-xl font-medium tracking-tight text-text"
        >
          <LogoMark className="size-6" />
          Goloka<span className="text-accent">.</span>
        </Link>

        <div className="flex flex-1 justify-center">
          <TopBarSearch />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className="inline-flex size-8 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text sm:hidden"
          >
            <Search className="size-5" />
          </Link>
        </div>
      </Container>
    </header>
  );
}
