import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/container";
import { localizedAlternates } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "About",
    description: "What Goloka is, how it works, and why it exists.",
    alternates: localizedAlternates(locale, "/about"),
  };
}

// A quiet, static content page (no data fetching) - linked from the footer
// rather than added to the app's fixed Home/Browse/Search nav (DESIGN.md).
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.about");

  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{t("h1")}</h1>

      {/* max-w-measure (the 68-character measure, DESIGN.md #3): this is the
          site's longest-running prose - every section below is a paragraph
          meant to be read, not skimmed, so the line length matters here
          more than almost anywhere else in the app. */}
      <div className="mt-6 max-w-measure space-y-6 text-text-muted">
        <p>{t("intro")}</p>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">{t("indexTitle")}</h2>
          <p className="mt-2">{t("indexBody")}</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">{t("belongsTitle")}</h2>
          <p className="mt-2">{t("belongsBody")}</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">{t("privacyTitle")}</h2>
          <p className="mt-2">{t("privacyBody1")}</p>
          <p className="mt-2">{t("privacyBody2")}</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">{t("independentTitle")}</h2>
          <p className="mt-2">{t("independentBody")}</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-text">{t("helpTitle")}</h2>
          <p className="mt-2">
            {t.rich("helpBody", {
              sendNote: (chunks) => (
                <a
                  href="mailto:nandisanjay.ns@gmail.com?subject=Goloka%20suggestion"
                  className="text-accent-strong underline-offset-4 hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>
      </div>
    </Container>
  );
}
