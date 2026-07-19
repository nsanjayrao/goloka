import type { Metadata } from "next";

import { Container } from "@/components/container";
import { LibraryClient } from "@/components/library-client";
import { PushToggle } from "@/components/push-toggle";

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
      {/* Sign-in independent on purpose: notifications carry no identity
          (lib/push.ts), so they aren't gated behind the Google sign-in
          above - anyone can turn these on. */}
      <div className="mt-10">
        <PushToggle />
      </div>
    </Container>
  );
}
