"use client"; // usePathname (to highlight the active tab) only works on
// the client - there's no server-side equivalent for "which route is this".

import { Bookmark, Compass, Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Bookmark },
] as const;

// Mobile-only bottom tab bar (DESIGN.md #4: "this is what makes the PWA feel
// native"). Black glass to match the top bar, with the 2026-07-05 premium
// pass: deeper blur, rounded top corners + a soft upward shadow so it reads as
// a floating glass slab, a gold indicator that springs between tabs, and a
// gentle icon scale on the active tab. `env(safe-area-inset-bottom)` keeps it
// clear of the iOS home indicator.
export function BottomTabBar() {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex(({ href }) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)
  );

  return (
    <nav
      aria-label="Primary"
      // Midnight glass slab: same recipe as the scrolled header (DESIGN.md
      // #6). The global tokens are already dark, so no local overrides.
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-section border-t border-hairline/60 bg-midnight/85 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex h-14 items-stretch justify-around">
        {/* Gold indicator at the active tab's top edge - one element that
            springs between tabs (each tab is 1/4, so translateX steps by its
            own width). Hidden when no tab is active (e.g. a /watch page). */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-[3px] w-1/4 transition-transform duration-300 ease-spring motion-reduce:transition-none"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <span className="mx-auto block h-full w-7 rounded-full bg-accent" />
          </span>
        )}

        {TABS.map(({ href, label, icon: Icon }, index) => {
          const active = index === activeIndex;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                active ? "text-accent" : "text-text-muted"
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform duration-300 ease-spring motion-reduce:transition-none",
                  active && "scale-110"
                )}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
