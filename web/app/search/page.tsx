import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/container";
import { SearchClient } from "@/components/search-client";
import { getAllCategories, getLatestVideos } from "@/lib/data";

// Canonical is the bare /search - the ?q= variants shouldn't be indexed as
// separate pages.
export const metadata: Metadata = { title: "Search", alternates: { canonical: "/search" } };

export default async function SearchPage() {
  // Both feed the resting state (before the user types): chips to browse
  // by category, and a "Newest additions" grid so the page is never a
  // lonely input box (DESIGN.md "Search"). Fetched in parallel.
  const [categories, latestVideos] = await Promise.all([
    getAllCategories(),
    getLatestVideos(10),
  ]);

  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">Search</h1>
      <div className="mt-6">
        {/* SearchClient reads the ?q= param via useSearchParams, which
            requires a Suspense boundary so Next.js can stream the rest of
            the page without waiting on client-side hooks. */}
        <Suspense>
          <SearchClient categories={categories} latestVideos={latestVideos} />
        </Suspense>
      </div>
    </Container>
  );
}
