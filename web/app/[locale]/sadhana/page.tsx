import type { Metadata } from "next";

import { Container } from "@/components/container";
import { SadhanaClient } from "@/components/sadhana-client";
import { localizedAlternates } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "My Sādhana",
    description: "Your own quiet record of the rounds you have chanted.",
    alternates: localizedAlternates(locale, "/sadhana"),
    // A personal page - nothing here for a crawler.
    robots: { index: false },
  };
}

// The shell is a server component for the app chrome; everything inside is
// client-side by nature (whose record is it?). Server components stay
// anonymous - this page, like /library, is one of the few where the session
// matters.
export default function SadhanaPage() {
  return (
    <Container className="page-top pb-10">
      <SadhanaClient />
    </Container>
  );
}
