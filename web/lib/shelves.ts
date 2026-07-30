import type { Video } from "@/lib/types";

// The browser half of app/api/shelves/route.ts. It exists so the two personal
// home shelves share ONE response shape and one failure policy, and so neither
// of them has to import lib/data - which is what used to drag the whole
// Supabase SDK into the home page's client bundle.

export type ShelvesResponse = {
  categories: { category: string; videos: Video[] }[];
  language: { language: string; videos: Video[] } | null;
};

const EMPTY: ShelvesResponse = { categories: [], language: null };

/** Fetch the personal shelves. Never throws: a failed request means the shelf
 * quietly does not render, exactly as an empty result does - the same
 * "render gracefully with nothing" contract lib/data's safely() gives the
 * server components. */
export async function fetchShelves(
  params: { categories?: string[]; language?: string },
  signal?: AbortSignal
): Promise<ShelvesResponse> {
  const query = new URLSearchParams();
  if (params.categories?.length) query.set("categories", params.categories.join(","));
  if (params.language) query.set("language", params.language);
  if (![...query.keys()].length) return EMPTY;

  try {
    const response = await fetch(`/api/shelves?${query}`, { signal });
    if (!response.ok) return EMPTY;
    return (await response.json()) as ShelvesResponse;
  } catch {
    // Includes the AbortError from a superseded request - the caller has
    // already moved on, so there is nothing to report.
    return EMPTY;
  }
}
