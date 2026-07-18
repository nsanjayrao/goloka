import type { Metadata } from "next";
import Link from "next/link";

import { CATEGORY_BLURBS, CATEGORY_ICONS, OM_ICON } from "@/components/category-cards";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { getAllCategories, getVideoCount } from "@/lib/data";

export const metadata: Metadata = {
  title: "Browse",
  description: "Browse ISKCON lectures, kirtans, festivals, and more by category on Goloka.",
  alternates: { canonical: "/browse" },
};

// Re-generate at most every 30 minutes so new categories/counts appear
// without a redeploy (same reasoning as the home page).
export const revalidate = 1800;

// The gold line-icon category cards (the home page's design language), not
// video-thumbnail posters: the poster grid used each category's NEWEST
// thumbnail, which meant random YouTube title-card collages fronting whole
// categories - a hospital slide fronting "Prasadam & Cooking" on the day
// this was rewritten (owner feedback 2026-07-18). Icons are ours, stable,
// and on-brand; the count line gives the card its factual weight. Category
// list is never hardcoded - it's `select distinct category` via lib/data.ts.
export default async function BrowsePage() {
  const categories = await getAllCategories();

  if (categories.length === 0) {
    return (
      <Container className="page-top pb-10">
        <h1 className="font-heading text-3xl text-text">Browse</h1>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  // One COUNT per category, in parallel - single digits of categories, so
  // this stays well within free-tier discipline.
  const counts = await Promise.all(categories.map((category) => getVideoCount({ category })));

  return (
    <Container className="page-top pb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="font-heading text-3xl text-text sm:text-4xl">Browse</h1>
        <Link href="/leaders" className="text-sm text-text-muted transition-colors hover:text-flame">
          Browse by Spiritual Leader →
        </Link>
      </div>

      <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        {categories.map((category, index) => (
          <Link key={category} href={`/browse/${encodeURIComponent(category)}`} className="cat">
            <span className="icon">{CATEGORY_ICONS[category] ?? OM_ICON}</span>
            <h2 className="font-heading text-[19px] [overflow-wrap:break-word]">{category}</h2>
            <p>{CATEGORY_BLURBS[category] ?? "Talks, teachings and more"}</p>
            <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-accent">
              {counts[index]} video{counts[index] === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
