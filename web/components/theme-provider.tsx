"use client"; // next-themes reads/writes localStorage and toggles a class
// on <html>, both browser-only operations, so this whole provider has to be
// a client component. It wraps the server-rendered app from layout.tsx.

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
