import type { Metadata, Viewport } from "next";
import { Figtree, Marcellus, Tiro_Devanagari_Hindi } from "next/font/google";

import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Footer } from "@/components/footer";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { TopBar } from "@/components/top-bar";
import { Veil } from "@/components/veil";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

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

export const metadata: Metadata = {
  // Absolute base for every relative canonical / OG image URL below and in
  // child routes (DESIGN.md #7). Without this, OG image paths stay relative
  // and social crawlers can't resolve them.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Goloka.",
    template: "%s — Goloka.",
  },
  description:
    "A free, centralized index of ISKCON lectures, kirtans, and festivals — sourced from official YouTube channels.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0F26", // --midnight (DESIGN.md #2)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${marcellus.variable} ${figtree.variable} ${tiro.variable}`}>
      <body className="min-h-screen bg-bg text-text antialiased">
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
      </body>
    </html>
  );
}
