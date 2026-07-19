import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

// Served by the service worker (public/sw.js) when a page navigation fails
// offline. Deliberately static - no data fetching - since it has to work
// with no network at all. The service worker caches ONLY the default
// locale's "/offline" (its hardcoded OFFLINE_URL) - the English version
// renders offline for every visitor regardless of locale, a known
// limitation of caching a single fallback page.
export default async function OfflinePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("emptyState");
  const tButtons = await getTranslations("buttons");

  return (
    <Container className="page-top pb-20">
      <EmptyState title={t("offlineTitle")} message={t("offlineMessage")}>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-accent-ink outline-none transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {tButtons("backToHome")}
        </Link>
      </EmptyState>
    </Container>
  );
}
