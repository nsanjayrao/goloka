import Link from "next/link";

import { LogoMark } from "@/components/icons/logo-mark";

// The one "promo band" DESIGN.md #4 calls for, placed once mid-page by
// app/page.tsx. Deliberately quiet: a surface panel, the lotus mark, one
// line of copy, one saffron button - no imagery, no extra accent fills.
export function PromoBand() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl bg-surface px-6 py-10 text-center">
      <LogoMark className="size-10 text-text" />
      <p className="max-w-md font-heading text-xl font-medium text-text sm:text-2xl">
        Every lecture, kirtan and festival — in one place.
      </p>
      <Link
        href="/browse"
        className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink transition-transform duration-200 ease-out hover:scale-[1.02]"
      >
        Browse everything →
      </Link>
    </section>
  );
}
