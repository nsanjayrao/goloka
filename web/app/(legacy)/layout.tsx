import type { Metadata, Viewport } from "next";
import { Figtree, Marcellus, Tiro_Devanagari_Hindi } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";

import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Footer } from "@/components/footer";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { Feather } from "@/components/feather";
import { Jali } from "@/components/jali";
import { SkipLink } from "@/components/skip-link";
import { TopBar } from "@/components/top-bar";
import { routing } from "@/i18n/routing";
import { DataSaverProvider } from "@/lib/data-saver";
import { SITE_URL } from "@/lib/site";
import enMessages from "@/messages/en.json";
import "../globals.css";

// This is a SECOND, independent Next.js root layout (its own <html>/<body>),
// a sibling to app/[locale]/layout.tsx via route groups - the documented
// Next.js "multiple root layouts" pattern. It exists only for the routes
// the i18n plan requires to stay completely outside locale routing (goal
// #3): /share-target and /c/[id]. Those pages keep exactly today's
// English-only chrome; wrapping it in NextIntlClientProvider (fixed to the
// default locale) just lets them reuse the same TopBar/Footer/BottomTabBar
// components - which now call useTranslations - without a parallel
// unlocalized copy of each.
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marcellus",
});
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figtree",
});
const tiro = Tiro_Devanagari_Hindi({
  subsets: ["latin", "devanagari"],
  weight: "400",
  variable: "--font-tiro",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Goloka.", template: "%s — Goloka." },
  description:
    "A free, centralized index of ISKCON lectures, kirtans, and festivals — sourced from official YouTube channels.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0F26", // --midnight - keep in step with app/[locale]/layout.tsx
};

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return (
    // This root layout is a SIBLING of app/[locale]/layout.tsx, not a child,
    // so any theme choice must be set here too - otherwise /c/[id] and
    // /share-target would be the only pages on a different theme from the
    // rest of the app. Both are on Midnight now; to switch to Aruṇa, add
    // data-theme="aruna" here AND in app/[locale]/layout.tsx.
    <html
      lang={routing.defaultLocale}
      className={`${marcellus.variable} ${figtree.variable} ${tiro.variable}`}
    >
      <body className="min-h-screen bg-bg text-text antialiased">
        <NextIntlClientProvider locale={routing.defaultLocale} messages={enMessages}>
          {/* One data-saver subscription for the tree - see [locale]/layout.tsx. */}
          <DataSaverProvider>
            <SkipLink />
            <Jali />
            <div className="grain" aria-hidden="true" />
            <TopBar />
            <main id="main" className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">
              {children}
            </main>
            <Footer />
            <BottomTabBar />
            <Feather />
            <RegisterServiceWorker />
          </DataSaverProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
