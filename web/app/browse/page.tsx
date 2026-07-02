import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { getAllCategories, getVideoCount } from "@/lib/data";

export const metadata: Metadata = { title: "Browse" };

// Category list is never hardcoded - it's `select distinct category from
// videos` (via lib/data.ts), so a new category the worker invents shows up
// here automatically.
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

  const counts = await Promise.all(categories.map((category) => getVideoCount({ category })));

  return (
    <Container className="py-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">Browse</h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <Link
            key={category}
            href={`/browse/${encodeURIComponent(category)}`}
            className="rounded-xl border border-border bg-surface p-6 transition-colors duration-200 ease-out hover:border-accent/40"
          >
            <h2 className="font-heading text-xl font-medium text-text">{category}</h2>
            <p className="mt-1 text-[13px] text-text-muted">
              {counts[index]} video{counts[index] === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
