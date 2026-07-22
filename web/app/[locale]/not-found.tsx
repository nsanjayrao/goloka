import { getTranslations } from "next-intl/server";

import { Container } from "@/components/container";
import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("emptyState");
  const tButtons = await getTranslations("buttons");

  return (
    <Container className="page-top pb-20">
      {/* The invocation thread (DESIGN.md #9): a lost visitor is met with
          Her name first - fixed liturgical text, same as /chant. */}
      <p className="text-center text-[13px] uppercase tracking-[0.24em] text-marigold">Rādhe Rādhe</p>
      <EmptyState title={t("notFoundTitle")} message={t("notFoundMessage")}>
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
