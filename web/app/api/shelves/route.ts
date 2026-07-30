import type { NextRequest } from "next/server";

import { getVideosByCategory, getVideosPage } from "@/lib/data";

// The home page's two PERSONAL shelves - "Because you watched <category>" and
// "In your language" - are the only rows whose contents depend on the visitor
// rather than on the catalogue, so they can never be part of the ISR-cached
// server render. They used to solve that by importing lib/data straight into
// client components and querying Supabase FROM THE BROWSER, which cost:
//
//   - up to 3 Supabase round-trips on every single home view, scaling with
//     TRAFFIC rather than with time (the exact opposite of what the 10-minute
//     ISR window buys us elsewhere, and the app's biggest free-tier exposure);
//   - ~59 kB gzipped of @supabase/supabase-js on home's client bundle,
//     including the Realtime websocket client this app never opens.
//
// Both go away here. The queries run on the server, so the SDK stays out of
// the browser entirely, and - the part that actually matters for the free
// tier - the response is CACHEABLE. Affinity categories repeat heavily across
// visitors, so most requests are served from the CDN and never reach the
// database at all. Moving the round-trip would have been a small win; making
// it cacheable is the real one.
//
// PRIVACY. What crosses the network is the visitor's top one or two CATEGORY
// NAMES and their chosen content language - never their watch history, never
// video ids, never anything identifying. The history itself stays in
// localStorage, as it always has (CLAUDE.md's privacy line), and the
// already-watched filtering still happens on-device AFTER this responds, so
// the server is never told what has been seen.

/** Matches MAX_SHELVES in because-you-watched.tsx. */
const MAX_CATEGORIES = 2;
/** Matches FETCH_SIZE there - a few more than a row shows, so filtering out
 * already-watched videos still leaves a full row. */
const ROW_FETCH = 12;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Bounded on every axis before anything reaches the database: at most two
  // categories, at most ROW_FETCH rows each. A hand-crafted URL cannot turn
  // this into an expensive query.
  const categories = (params.get("categories") ?? "")
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean)
    .slice(0, MAX_CATEGORIES);
  const language = params.get("language")?.trim() || null;

  // One Promise.all, so the two or three queries run concurrently rather than
  // in series. Every one of them is a lib/data function behind safely(), so an
  // unreachable database yields empty rows instead of a 500 - the shelf simply
  // does not render, which is the same thing a visitor with no history sees.
  const [categoryLists, languageVideos] = await Promise.all([
    Promise.all(categories.map((category) => getVideosByCategory(category, ROW_FETCH))),
    language ? getVideosPage({ language }, 0, ROW_FETCH) : Promise.resolve([]),
  ]);

  return Response.json(
    {
      categories: categories.map((category, index) => ({
        category,
        videos: categoryLists[index],
      })),
      language: language ? { language, videos: languageVideos } : null,
    },
    {
      headers: {
        // Ten minutes at the edge, matching the home page's own revalidate,
        // then an hour of stale-while-revalidate so a cold key never makes a
        // devotee wait on the database.
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    }
  );
}
