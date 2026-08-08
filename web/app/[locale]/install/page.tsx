import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Container } from "@/components/container";
import { InstallGuide } from "@/components/install-guide";
import { localizedAlternates } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.install" });
  return {
    title: t("h1"),
    description: t("intro"),
    alternates: localizedAlternates(locale, "/install"),
  };
}

// The three platforms, in the order they render with JavaScript off. Android
// first because it is where most of the audience is; desktop last because a
// desktop visitor is the least likely of the three to want this at all.
// InstallGuide reorders them client-side to match the actual device.
const PLATFORMS = ["android", "ios", "desktop"] as const;

// How many numbered steps each card has. next-intl has no "give me every key
// under this prefix", and a loop needs to know where to stop - so the count
// lives here and the messages files must agree with it. Adding a step means
// bumping the number here AND adding the key in all six locales.
const STEP_COUNT: Record<(typeof PLATFORMS)[number], number> = {
  android: 4,
  ios: 5,
  desktop: 3,
};

// The signed APK, for installing without the Play Store. Points at
// `releases/latest` rather than a pinned tag, so it follows every future
// release without this file ever changing. The release PAGE, not the asset's
// direct download URL - someone sideloading an app deserves to see the notes
// and the checksum before the file lands on their phone.
const APK_RELEASE_URL = "https://github.com/nsanjayrao/goloka/releases/latest";

/**
 * /install (DESIGN.md #6) - how to put Goloka on a home screen. Entirely
 * static content: no data fetching, no database, nothing that can fail. The
 * only client code is the thin InstallGuide wrapper, which reorders these
 * cards and offers Chromium's install button; the cards themselves are
 * server-rendered and readable with JavaScript off.
 */
export default async function InstallPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.install");

  return (
    <Container className="page-top pb-10">
      <h1 className="font-heading text-3xl font-medium text-text sm:text-4xl">{t("h1")}</h1>
      <p className="mt-4 max-w-measure text-text-muted">{t("intro")}</p>
      <p className="mt-3 max-w-measure text-sm text-text-muted">{t("free")}</p>

      <div className="mt-8">
        <InstallGuide>
          {PLATFORMS.map((platform) => (
            <section key={platform} className="install-card" data-for={platform}>
              <span className="kicker">{t(`${platform}.kicker`)}</span>
              <h2 className="title">{t(`${platform}.title`)}</h2>
              <ol className="install-steps">
                {Array.from({ length: STEP_COUNT[platform] }, (_, index) => (
                  <li key={index}>{t(`${platform}.step${index + 1}`)}</li>
                ))}
              </ol>
              <p className="install-note">{t(`${platform}.note`)}</p>
              {/* Android only: the same app, obtained the other way. */}
              {platform === "android" && (
                <a className="install-apk" href={APK_RELEASE_URL} target="_blank" rel="noopener noreferrer">
                  <span className="title">{t("android.apkTitle")}</span>
                  <span className="note">{t("android.apkNote")}</span>
                </a>
              )}
            </section>
          ))}
        </InstallGuide>
      </div>

      <div className="mt-10 max-w-measure space-y-3 text-sm text-text-muted">
        <h2 className="font-heading text-xl font-medium text-text">{t("whatYouGetTitle")}</h2>
        <p>{t("whatYouGetBody")}</p>
        <p>{t("storageNote")}</p>
      </div>
    </Container>
  );
}
