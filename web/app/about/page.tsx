import type { Metadata } from "next";

import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "About",
  description: "What Goloka is, how it works, and why it exists.",
  alternates: { canonical: "/about" },
};

// A quiet, static content page (no data fetching) - linked from the footer
// rather than added to the app's fixed Home/Browse/Search nav (DESIGN.md).
export default function AboutPage() {
  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">About Goloka</h1>

      <div className="mt-6 max-w-2xl space-y-6 text-text-muted">
        <p>
          Goloka is a free, ad-free index of ISKCON content on YouTube —
          lectures, kirtans, festivals, and documentaries from dozens of
          temples and teachers, gathered in one calm place instead of scattered
          across the platform.
        </p>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">Index, never host</h2>
          <p className="mt-2">
            Goloka stores no video files. Every listing is metadata — a title,
            a thumbnail, a category — and every video plays through YouTube&apos;s
            own standard embedded player. Watching here is the same as watching
            on YouTube directly; Goloka just makes it easier to find.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">All content belongs to its creators</h2>
          <p className="mt-2">
            Every video links back to its source channel. Goloka doesn&apos;t
            re-host, re-edit, or monetize anyone&apos;s content — it&apos;s simply a
            directory pointing to work that already belongs to the temples and
            speakers who made it.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">Privacy, honestly</h2>
          <p className="mt-2">
            Goloka never tracks what you watch. &quot;Continue Watching&quot; lives only
            in your own browser and is never sent anywhere — clearing your
            browser data clears it completely, signed in or not.
          </p>
          <p className="mt-2">
            Signing in is optional and exists for exactly one thing: keeping
            your favourites and watch-later list with you across devices.
            That&apos;s all an account stores — two lists of video links. No
            viewing history, no analytics profile, nothing sold or shared.
            Delete your account and everything it held is deleted with it.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">An independent project</h2>
          <p className="mt-2">
            Goloka is an independent, non-commercial project — not an official
            ISKCON website, and not affiliated with any single temple. It runs
            entirely on free-tier infrastructure, with no ads and nothing for
            sale.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">Help improve it</h2>
          <p className="mt-2">
            Know a channel that belongs here, or spot something miscategorized?{" "}
            <a
              href="mailto:nandisanjay.ns@gmail.com?subject=Goloka%20suggestion"
              className="text-accent-strong underline-offset-4 hover:underline"
            >
              Send a note
            </a>{" "}
            — every suggestion is read.
          </p>
        </section>
      </div>
    </Container>
  );
}
