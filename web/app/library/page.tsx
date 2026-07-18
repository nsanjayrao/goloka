import type { Metadata } from "next";

import { Container } from "@/components/container";
import { LibraryClient } from "@/components/library-client";

export const metadata: Metadata = {
  title: "My Library",
  description: "Your favourites and watch-later list.",
  alternates: { canonical: "/library" },
  // A personal page - nothing here for a crawler.
  robots: { index: false },
};

// The shell is a server component for the app chrome; everything inside is
// client-side by nature (whose library is it?). Server components stay
// anonymous - this page is the one place the session matters.
export default function LibraryPage() {
  return (
    <Container className="page-top pb-10">
      <LibraryClient />
    </Container>
  );
}
