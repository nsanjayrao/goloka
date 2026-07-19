import type { Metadata } from "next";

import { Container } from "@/components/container";
import { LibraryClient } from "@/components/library-client";
import { PushToggle } from "@/components/push-toggle";
import { localizedAlternates } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "My Library",
    description: "Your favourites and watch-later list.",
    alternates: localizedAlternates(locale, "/library"),
    // A personal page - nothing here for a crawler.
    robots: { index: false },
  };
}

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
