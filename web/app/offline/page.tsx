import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";

// Served by the service worker (public/sw.js) when a page navigation fails
// offline. Deliberately static - no data fetching - since it has to work
// with no network at all.
export default function OfflinePage() {
  return (
    <Container className="py-20">
      <EmptyState message="You're offline. Goloka needs a connection to fetch videos — reconnect and try again." />
    </Container>
  );
}
