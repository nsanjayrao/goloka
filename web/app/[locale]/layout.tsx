import type { Metadata, Viewport } from "next";
import { Figtree, Marcellus, Tiro_Devanagari_Hindi } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Footer } from "@/components/footer";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { TopBar } from "@/components/top-bar";
import { Veil } from "@/components/veil";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

// next/font/google downloads and self-hosts each font at build time (no
// runtime request to Google, no layout shift). The `variable` options expose
// them as CSS custom properties that globals.css's --display/--body stacks
// point at. Tiro Devanagari Hindi is the fallback in BOTH stacks so Hindi
// titles render as elegant serif, never system fallback (DESIGN.md #3).
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400", // Marcellus ships a single weight
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

// One static page per locale (ISR goal #2): this is what makes
// `/`, `/hi`, `/bn`, `/ru`, `/es` (and every nested static page) all
// pre-render at build time instead of falling back to per-request
// rendering just because i18n exists.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  // hreflang (goal #7): tells search engines the same page exists in every
  // locale, keyed by the SAME path so /browse, /hi/browse, /bn/browse, etc.
  // all point at each other. "x-default" is the unprefixed English URL -
  // the correct fallback for a locale next-intl doesn't recognize.
  const languages: Record<string, string> = { "x-default": "/" };
  for (const l of routing.locales) {
    languages[l] = l === routing.defaultLocale ? "/" : `/${l}`;
  }

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Goloka.",
      template: "%s — Goloka.",
    },
    description:
      "A free, centralized index of ISKCON lectures, kirtans, and festivals — sourced from official YouTube channels.",
    manifest: "/manifest.json",
    alternates: { languages },
    other: { "content-language": locale },
  };
}

export const viewport: Viewport = {
  themeColor: "#0A0F26", // --midnight (DESIGN.md #2)
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();

  // Enables static rendering for this request (the next-intl App Router
  // requirement alongside generateStaticParams above) - without it every
  // locale page would opt into dynamic rendering just by reading the
  // locale, defeating ISR (goal #2).
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${marcellus.variable} ${figtree.variable} ${tiro.variable}`}>
      <body className="min-h-screen bg-bg text-text antialiased">
        <NextIntlClientProvider messages={messages}>
          {/* Darshan curtain (first visit per session) + film grain overlay
              (DESIGN.md #5.1 / #5.11) sit above everything and never catch
              pointer events. */}
          <Veil />
          <div className="grain" aria-hidden="true" />
          <TopBar />
          <main className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</main>
          <Footer />
          <BottomTabBar />
          <RegisterServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
