import { Search } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/container";
import { LogoMark } from "@/components/icons/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopBarSearch } from "@/components/top-bar-search";

// Sticky translucent top bar (DESIGN.md #4 "App shell"). Stays a server
// component - only the search box and theme toggle need the browser, and
// they're carved out into their own small client components.
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
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
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
