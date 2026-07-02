import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Footer } from "@/components/footer";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { ThemeProvider } from "@/components/theme-provider";
import { TopBar } from "@/components/top-bar";
import "./globals.css";

// next/font/google downloads and self-hosts the font at build time (no
// runtime request to Google, no layout shift from a late-loading webfont).
// The `variable` option exposes it as a CSS custom property that
// globals.css's `--font-heading` / `--font-sans` point at.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Goloka.",
    template: "%s — Goloka.",
  },
  description:
    "A free, centralized index of ISKCON lectures, kirtans, and festivals — sourced from official YouTube channels.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B0E1A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the `dark`/`light` class on
    // <html> before React hydrates, which would otherwise cause a harmless
    // but noisy hydration-mismatch warning.
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-bg text-text antialiased">
        <ThemeProvider>
          <TopBar />
          <main className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</main>
          <Footer />
          <BottomTabBar />
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
