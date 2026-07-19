import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { getVideoByYoutubeId } from "@/lib/data";
import { extractYouTubeId } from "@/lib/youtube-url";

// The Web Share Target endpoint (public/manifest.json "share_target"):
// Android's share sheet opens this page when someone shares INTO the
// installed Goloka app - most importantly a YouTube link from the YouTube
// app. The OS fills ?title=&text=&url= (the YouTube app usually puts the
// link in `text`, not `url`), so we look for a video ID in all three.
export const metadata: Metadata = {
  title: "Shared with Goloka",
  // A transient hand-off page - nothing here for a crawler.
  robots: { index: false },
};

// The share payload is fresh every time - never cache this route.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ title?: string | string[]; text?: string | string[]; url?: string | string[] }>;
};

// A repeated query param (?text=a&text=b) arrives as an array; a share
// payload is defensive territory, so collapse anything to a plain string.
function asString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : (value?.[0] ?? "");
}

export default async function ShareTargetPage({ searchParams }: Props) {
  const params = await searchParams;
  const url = asString(params.url);
  const text = asString(params.text);
  const title = asString(params.title);

  // Whichever field carries a recognizable YouTube link wins - `url` is the
  // spec'd slot, but the YouTube app shares via `text`, and some apps only
  // fill `title`.
  const videoId = extractYouTubeId(url) ?? extractYouTubeId(text) ?? extractYouTubeId(title);

  if (!videoId) {
    // No YouTube link at all - treat the share as a search. Truncate so a
    // pasted essay doesn't become an absurd URL; encodeURIComponent keeps
    // any characters safe.
    const query = (text || title || url).slice(0, 100).trim();
    redirect(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  const video = await getVideoByYoutubeId(videoId);
  if (video) redirect(`/watch/${videoId}`);

  // A real YouTube video, but not one Goloka indexes. Explain gently and
  // hand the visitor onward - never a dead end.
  return (
    <Container className="page-top pb-20">
      <EmptyState
        title="Not in Goloka's index"
        message="This video isn't in Goloka's index — we index a curated set of official ISKCON channels. You can still watch it on YouTube, or explore what's here."
      >
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink outline-none transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Watch on YouTube ↗
          </a>
          <Link
            href="/browse"
            className="text-sm text-text-muted underline-offset-4 outline-none transition-colors hover:text-flame hover:underline focus-visible:ring-2 focus-visible:ring-accent"
          >
            Browse Goloka →
          </Link>
        </div>
      </EmptyState>
    </Container>
  );
}
