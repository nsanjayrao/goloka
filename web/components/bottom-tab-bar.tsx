"use client"; // usePathname (to highlight the active tab) only works on
// the client - there's no server-side equivalent for "which route is this".

import { Bookmark, CircleDashed, Compass, Home, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { MoreSheet } from "@/components/more-sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Four tabs became five (2026-07-23). Search LEFT the bar rather than being
// squeezed alongside the others: the header's search pill is the one piece of
// nav that already survives under 600px, so a Search tab was the only
// duplicated destination here. Its slot went to Chant - the thing a devotee
// opens daily - and a fifth "More" tab now leads to everything that was
// previously unreachable on a phone without scrolling to the footer
// (Begin Here, Sādhana, Calendar, Leaders, Books, Temples, About).
const TABS = [
  { href: "/", key: "home", icon: Home },
  { href: "/browse", key: "browse", icon: Compass },
  { href: "/chant", key: "chant", icon: CircleDashed },
  { href: "/library", key: "library", icon: Bookmark },
] as const;

// Five slots, so the indicator and each tab are a fifth of the bar.
const SLOT_COUNT = TABS.length + 1;

// Mobile-only bottom tab bar (DESIGN.md #4: "this is what makes the PWA feel
// native"). Glass slab to match the top bar, with a gold indicator that
// springs between tabs and a gentle icon scale on the active one.
// `env(safe-area-inset-bottom)` keeps it clear of the iOS home indicator.
// `usePathname` comes from i18n/navigation, which strips the locale prefix -
// so the active-tab match below works identically in every locale.
export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("tabs");
  const tLandmarks = useTranslations("landmarks");
  const activeIndex = TABS.findIndex(({ href }) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)
  );

  return (
    <nav
      aria-label={tLandmarks("primary")}
      // Midnight glass slab: same recipe as the scrolled header (DESIGN.md
      // #6), through the shared --glass token so chrome written here and
      // chrome written in globals.css stay one decision.
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-section border-t border-hairline/60 bg-glass/85 shadow-[0_-4px_24px_rgb(var(--shadow-rgb)/0.4)] backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex h-14 items-stretch justify-around">
        {/* Gold indicator at the active tab's top edge - one element that
            springs between tabs. FADED OUT rather than unmounted when no tab
            is active (a /watch page, or a More destination): unmounting it
            meant Home -> Watch -> Browse removed the element with no fade and
            then mounted a brand new one already at its destination, with
            nothing to transition FROM - so the 300ms slide only ever played
            on a direct tab-to-tab tap. Keeping it mounted keeps the movement
            continuous. Max(_, 0) parks it under the first slot while hidden,
            so it never animates in from an arbitrary position. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[3px] transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none"
          style={{
            width: `${100 / SLOT_COUNT}%`,
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
        >
          <span className="mx-auto block h-full w-7 rounded-full bg-accent" />
        </span>

        {TABS.map(({ href, key, icon: Icon }, index) => {
          const active = index === activeIndex;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(TAB_CLASS, active ? "text-accent" : "text-text-muted")}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform duration-300 ease-spring motion-reduce:transition-none",
                  active && "scale-110"
                )}
              />
              {t(key)}
            </Link>
          );
        })}

        {/* The fifth slot is a button, not a link - it opens the sheet in
            place rather than navigating somewhere called "More". */}
        <MoreSheet className={cn(TAB_CLASS, "text-text-muted")}>
          <MoreHorizontal className="size-5" aria-hidden="true" />
          {t("more")}
        </MoreSheet>
      </div>
    </nav>
  );
}

const TAB_CLASS =
  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";
