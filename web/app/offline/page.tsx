import Link from "next/link";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";

// Served by the service worker (public/sw.js) when a page navigation fails
// offline. Deliberately static - no data fetching - since it has to work
// with no network at all. The service worker caches ONLY this page, so
// "Back to Home" acts as a retry: while still offline the navigation
// fails and lands back here; once the connection returns it goes home.
export default function OfflinePage() {
  return (
    <Container className="page-top pb-20">
      <EmptyState
        title="You're offline"
        message="Goloka needs a connection to fetch videos — reconnect and try again."
      >
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
