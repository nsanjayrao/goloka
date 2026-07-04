import Link from "next/link";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <Container className="py-20">
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
