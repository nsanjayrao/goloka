"use client"; // navigator.share / navigator.clipboard are browser-only.

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

// The /watch meta-row share chip (DESIGN.md "Video page"). Native share
// sheet on devices that support it (mostly mobile); clipboard-copy with a
// brief "Copied" confirmation everywhere else. No social SDKs. Styles
// itself with the palette tokens, so it inherits the watch page's dark-band
// white override just like the channel chip beside it.
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Build the absolute URL at click time so it's correct on any deploy
    // host without hardcoding the domain.
    const url = `${window.location.origin}${path}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // User dismissed the sheet, or the share was cancelled - not an
        // error worth surfacing.
      }
      return;
    }

    // Fallback: copy the link and confirm for ~2s.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (rare, e.g. insecure context) - nothing better
      // to do silently.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-text outline-none transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent"
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
