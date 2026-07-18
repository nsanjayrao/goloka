import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/container";
import { BOOKS, ESSENTIALS } from "@/lib/books";

export const metadata: Metadata = {
  title: "Sacred Library",
  description:
    "Śrīla Prabhupāda's books — read free on Vedabase or get them from the official BBT store.",
  alternates: { canonical: "/books" },
};

// A fully static page (no data fetching): the registry lives in
// lib/books.ts. Index, never host - every card links out to the BBT's own
// Vedabase and store; the "spines" are typographic, no cover artwork.
export default function BooksPage() {
  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl text-text sm:text-4xl">Sacred Library</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        Śrīla Prabhupāda&apos;s books — the heart of everything taught in the
        lectures indexed here. Read them free on the BBT&apos;s own Vedabase, or
        get a printed copy from the official store.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BOOKS.map((book) => {
          const inwardHref = book.topicSlug
            ? `/topic/${book.topicSlug}`
            : book.searchQuery
              ? `/search?q=${encodeURIComponent(book.searchQuery)}`
              : null;
          return (
            <article
              key={book.slug}
              className="group relative flex flex-col rounded-section border border-border bg-gradient-to-br from-surface to-bg p-6 transition-colors hover:border-hairline"
            >
              {/* Typographic spine: gold rule + Marcellus title. */}
              <div className="mb-4 h-px w-9 bg-accent" aria-hidden="true" />
              <h2 className="font-heading text-[22px] leading-snug text-text" title={book.title}>
                {book.spine}
              </h2>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-text-muted">
                {book.subtitle}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                <a
                  href={book.vedabaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent-strong underline-offset-4 hover:underline"
                >
                  Read free ↗
                </a>
                <a
                  href={book.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted underline-offset-4 hover:text-flame hover:underline"
                >
                  Get the book ↗
                </a>
                {inwardHref && (
                  <Link
                    href={inwardHref}
                    className="ml-auto text-text-muted transition-colors hover:text-flame"
                  >
                    Classes →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <h2 className="mt-14 font-heading text-2xl text-text">Devotional essentials</h2>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        From the official BBT store only — Goloka links, never sells.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ESSENTIALS.map((item) => (
          <a
            key={item.title}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-card border border-border bg-surface/40 p-4 transition-colors hover:border-hairline"
          >
            <span className="block text-[15px] font-medium text-text">{item.title} ↗</span>
            <span className="mt-1 block text-[13px] text-text-muted">{item.subtitle}</span>
          </a>
        ))}
      </div>

      <p className="mt-10 max-w-2xl text-[13px] text-text-muted/80">
        All books and goods are published and sold by the Bhaktivedanta Book
        Trust and official ISKCON outlets. Goloka is an index — it hosts
        nothing and earns nothing from these links.
      </p>
    </Container>
  );
}
