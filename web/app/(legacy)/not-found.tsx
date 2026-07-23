import Link from "next/link";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";

// A 404 within the (legacy) route group (/share-target, /c/[id]) - this
// group deliberately stays outside locale routing (i18n plan goal #3), so
// this mirrors the English copy in app/[locale]/not-found.tsx rather than
// pulling in getTranslations.
//
// Audit finding (2026-07-23): the invocation thread (DESIGN.md #9 - a lost
// visitor is met with "Rādhe Rādhe" before the error message) was added to
// app/[locale]/not-found.tsx but missed this sibling file, since the two
// aren't in the same route tree and Next never falls back from one to the
// other - a devotee hitting a dead /c/<id> link saw the plain empty state.
export default function LegacyNotFound() {
  return (
    <Container className="page-top pb-20">
      <p className="text-center text-[13px] uppercase tracking-[0.24em] text-marigold">Rādhe Rādhe</p>
      <EmptyState title="Page not found" message="This page wandered off the path — nothing to see here.">
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink outline-none transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Back to Home
        </Link>
      </EmptyState>
    </Container>
  );
}
