import Link from "next/link";

import { LogoMark } from "@/components/icons/logo-mark";
import { Ornament } from "@/components/ornament";
import { quoteOfTheDay } from "@/lib/quotes";

// The one "promo band" DESIGN.md #4 calls for, placed once mid-page by
// app/page.tsx. Now the home page's "Daily Inspiration" moment (DESIGN.md
// #6): a Srila Prabhupada quote chosen by the calendar day, framed by the
// lotus mark and a single gold flourish, with the one browse CTA. Still a
// server component - the quote is picked at render, no client JS.
export function PromoBand() {
  const quote = quoteOfTheDay();

  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl bg-surface px-6 py-12 text-center">
      <LogoMark className="size-9 text-text" />
      <p className="max-w-xl font-heading text-xl font-medium italic leading-relaxed text-text sm:text-2xl">
        “{quote.text}”
      </p>
      <p className="text-sm text-text-muted">— {quote.source}</p>
      <Ornament className="my-1" />
      <Link
        href="/browse"
        className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink outline-none transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Browse everything →
      </Link>
    </section>
  );
}
