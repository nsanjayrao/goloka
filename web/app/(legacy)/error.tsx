"use client"; // error boundaries must be client components.

import Link from "next/link";
import { useEffect } from "react";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";

// An error boundary within the (legacy) route group (/share-target, /c/[id])
// - mirrors app/[locale]/error.tsx (see its comment for the full reasoning),
// kept in English-only like this group's own not-found.tsx, since it
// deliberately stays outside locale routing (i18n plan goal #3).
export default function LegacyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="page-top pb-20">
      <p className="text-center text-[13px] uppercase tracking-[0.24em] text-marigold">Rādhe Rādhe</p>
      <EmptyState title="Something went wrong" message="This page stumbled loading — try again, or head back home. Nothing you were doing has been lost.">
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink outline-none transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-sm text-text-muted underline-offset-4 outline-none transition-colors hover:text-flame hover:underline focus-visible:ring-2 focus-visible:ring-accent"
          >
            Back to Home
          </Link>
        </div>
      </EmptyState>
    </Container>
  );
}
