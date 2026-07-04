"use client"; // usePathname (to highlight the active tab) only works on
// the client - there's no server-side equivalent for "which route is this".

import { Compass, Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Browse", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
] as const;

// Mobile-only bottom tab bar (DESIGN.md #4: "this is what makes the PWA
// feel native"). Black glass to match the top bar - dark chrome on both
// edges of the phone, Apple-style - using the same CSS-variable re-skin
// as top-bar.tsx. `env(safe-area-inset-bottom)` keeps it clear of the
// home indicator on iOS.
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur sm:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        ...({
          "--accent": "#f0a83c",
          "--text-muted": "rgba(255,255,255,0.6)",
        } as React.CSSProperties),
      }}
    >
      <div className="flex h-14 items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
                active ? "text-accent" : "text-text-muted"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
