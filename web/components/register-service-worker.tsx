"use client"; // navigator.serviceWorker only exists in the browser.

import { useEffect } from "react";

// Registers public/sw.js once the app has loaded. Renders nothing - it's
// purely a side-effect component, mounted once in the root layout.
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Not fatal - the app works fine without an offline fallback.
      });
    }
  }, []);

  return null;
}
