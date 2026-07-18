"use client"; // navigator.share / navigator.clipboard are browser-only.

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { SITE_URL } from "@/lib/site";

// Shared chip look (DESIGN.md "Video page" meta row) so the native-share
// chip and the WhatsApp chip below read as one family.
const CHIP_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-text outline-none transition-colors hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent";

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
    <button type="button" onClick={handleShare} className={CHIP_CLASS}>
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}

// Dedicated WhatsApp share chip — devotees mostly spread Goloka links
// through WhatsApp, so it gets a first-class link next to the generic Share
// button rather than being buried behind the native share sheet (which many
// desktop browsers don't even implement). A plain anchor to wa.me: no SDK,
// no JS needed to build the link, works with or without the WhatsApp app
// installed (falls back to web.whatsapp.com). The absolute URL is built
// from the fixed SITE_URL rather than window.location, so this chip is
// correct even if it were ever rendered outside a client-interaction
// boundary.
export function WhatsAppShareButton({ title, path }: { title: string; path: string }) {
  const url = `${SITE_URL}${path}`;
  const text = `${title} — ${url}`;
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={CHIP_CLASS} aria-label="Share on WhatsApp">
      {/* Standard WhatsApp glyph, drawn inline (no icon library carries it). */}
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
      </svg>
      WhatsApp
    </a>
  );
}
