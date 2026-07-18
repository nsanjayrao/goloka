import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { getLiveVideos } from "@/lib/data";
import { TEMPLES } from "@/lib/temples";

export const metadata: Metadata = {
  title: "Temples",
  description: "Major ISKCON temples — official websites, indexed channels, and who's streaming live.",
  alternates: { canonical: "/temples" },
};

// Refresh at the live-check cadence so the LIVE dot on a temple card
// tracks reality (same reasoning as the home page's 10-min ISR).
export const revalidate = 600;

export default async function TemplesPage() {
  // Which temples are streaming right now - matched by channel handle.
  const liveHandles = new Set(
    (await getLiveVideos(12))
      .map((video) => video.channel?.handle)
      .filter(Boolean) as string[]
  );

  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl text-text sm:text-4xl">Temples</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        Major ISKCON centers around the world. Every card links to the
        temple&apos;s own website; temples whose channels Goloka indexes link to
        their catalog here too.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLES.map((temple) => {
          const isLive = temple.channelHandle ? liveHandles.has(temple.channelHandle) : false;
          return (
            <article
              key={temple.name}
              className="flex flex-col rounded-section border border-border bg-gradient-to-br from-surface to-bg p-6 transition-colors hover:border-hairline"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-[20px] leading-snug text-text">{temple.name}</h2>
                {isLive && (
                  <span className="live-badge shrink-0 !static" aria-label="Streaming live now">
                    Live
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-text-muted">
                {temple.city} · {temple.country}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                <a
                  href={temple.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent-strong underline-offset-4 hover:underline"
                >
                  Website ↗
                </a>
                {temple.channelHandle && (
                  <Link
                    href={`/channel/${encodeURIComponent(temple.channelHandle)}`}
                    className="text-text-muted transition-colors hover:text-flame"
                  >
                    Videos on Goloka →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-10 max-w-2xl text-[13px] text-text-muted/80">
        Know a temple that belongs here?{" "}
        <a
          href="mailto:nandisanjay.ns@gmail.com?subject=Goloka%20temple%20suggestion"
          className="text-accent-strong underline-offset-4 hover:underline"
        >
          Send a note
        </a>
        .
      </p>
    </Container>
  );
}
