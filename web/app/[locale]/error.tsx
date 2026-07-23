"use client"; // error boundaries are React error boundaries under the
// hood, so this file is required to be a client component - the one
// server-only piece here (getTranslations) can't be used; useTranslations
// is the client equivalent.

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";

// Audit finding (2026-07-23): no error.tsx existed anywhere in the app, so
// a genuine runtime error (as opposed to a missing page) fell through to
// Next's own default error screen - unstyled, off-brand, breaking the calm
// register every other dead-end (404, offline, share-target) was carefully
// given. This is the same EmptyState + invocation-thread treatment as
// not-found.tsx, with a "try again" reset() alongside the way home, since
// (unlike a missing page) a transient error is often worth simply retrying.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("emptyState");
  const tButtons = useTranslations("buttons");

  useEffect(() => {
    // Console only - no error-reporting service exists in this project
    // (everything runs on free tiers, deliberately no added infra), but a
    // silently swallowed error is worse than one that at least reaches
    // devtools for whoever's debugging.
    console.error(error);
  }, [error]);

  return (
    <Container className="page-top pb-20">
      {/* The invocation thread (DESIGN.md #9): met with Her name first,
          same as /chant and the 404 page. */}
      <p className="text-center text-[13px] uppercase tracking-[0.24em] text-marigold">Rādhe Rādhe</p>
      <EmptyState title={t("errorTitle")} message={t("errorMessage")}>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink outline-none transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {tButtons("tryAgain")}
          </button>
          <Link
            href="/"
            className="text-sm text-text-muted underline-offset-4 outline-none transition-colors hover:text-flame hover:underline focus-visible:ring-2 focus-visible:ring-accent"
          >
            {tButtons("backToHome")}
          </Link>
        </div>
      </EmptyState>
    </Container>
  );
}
