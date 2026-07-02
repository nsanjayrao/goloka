import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/container";
import { SearchClient } from "@/components/search-client";
import { getAllCategories } from "@/lib/data";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  const categories = await getAllCategories();

  return (
    <Container className="py-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">Search</h1>
      <div className="mt-6">
        {/* SearchClient reads the ?q= param via useSearchParams, which
            requires a Suspense boundary so Next.js can stream the rest of
            the page without waiting on client-side hooks. */}
        <Suspense>
          <SearchClient categories={categories} />
        </Suspense>
      </div>
    </Container>
  );
}
