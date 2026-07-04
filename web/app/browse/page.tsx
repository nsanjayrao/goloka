import type { Metadata } from "next";

import { CategoryPoster } from "@/components/category-poster";
import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { getAllCategories, getVideoCount, getVideosByCategory } from "@/lib/data";

export const metadata: Metadata = { title: "Browse", alternates: { canonical: "/browse" } };

// Re-generate at most every 30 minutes so new categories/counts appear
// without a redeploy (same reasoning as the home page).
export const revalidate = 1800;

// The duotone poster system promoted to a full page (DESIGN.md "Browse
// index"): the same <CategoryPoster> as the home shelf, laid out as a
// responsive grid instead of a scroll row. Category list is never
// hardcoded - it's `select distinct category from videos` (via
// lib/data.ts), so a new category the worker invents shows up here
// automatically.
export default async function BrowsePage() {
  const categories = await getAllCategories();

  if (categories.length === 0) {
    return (
      <Container className="py-10">
        <h1 className="font-heading text-3xl font-medium text-text">Browse</h1>
        <EmptyState message="Nothing here yet — like Vrindavan before the festival. Check back soon." />
      </Container>
    );
  }

  // Two small queries per category (count + newest video for the poster
  // artwork), all in parallel. Category count is single digits, so this
  // stays well within free-tier discipline.
  const posters = await Promise.all(
    categories.map(async (category) => {
      const [count, newest] = await Promise.all([
        getVideoCount({ category }),
        getVideosByCategory(category, 1),
      ]);
      return {
        category,
        count,
        thumbnail: newest[0]?.thumbnail_url ?? null,
      };
    })
  );

  return (
    <Container className="py-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">Browse</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {posters.map(({ category, count, thumbnail }) => (
          <CategoryPoster
            key={category}
            category={category}
            thumbnail={thumbnail}
            meta={`${count} video${count === 1 ? "" : "s"}`}
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          />
        ))}
      </div>
    </Container>
  );
}
