"use client"; // navigator.userAgent, display-mode and beforeinstallprompt are
// all browser-only, and none of them can be known while rendering on the
// server.

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

// The three platforms the page has a card for. "desktop" is the honest
// default rather than a guess: on an unrecognised browser every card stays
// in document order, which is exactly the server-rendered page.
type Platform = "android" | "ios" | "desktop";

// The slice of BeforeInstallPromptEvent we use. It is a Chromium-only event
// with no entry in lib.dom.d.ts, so TypeScript needs telling it exists -
// declaring only what we call keeps that honest (no `any`, and no pretending
// to implement an interface we never touch the rest of).
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

/**
 * Detects the platform from the user agent. UA sniffing is the wrong tool
 * for deciding what a browser can DO - but this decides only which set of
 * instructions floats to the top, and "which device is in your hands" is
 * precisely what no feature test can answer.
 *
 * iPadOS 13+ deliberately reports itself as a Macintosh, so the touch-point
 * count is the only thing separating an iPad from a desktop Safari; a real
 * Mac reports 0.
 */
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "desktop";
}

// ---------------------------------------------------------------------------
// Browser state, held in module scope and read through useSyncExternalStore -
// the codebase's standard shape for anything that only exists in a browser
// (lib/data-saver.ts, lib/recent-searches.ts). Every store below has a
// NEUTRAL server snapshot, so the server render and the first client render
// agree and hydration has nothing to reconcile; the real values land on the
// render straight after.
//
// The listeners are registered at MODULE level rather than in an effect, and
// that is the point of doing it here: Chromium fires beforeinstallprompt very
// early, often before React has mounted this component. An effect would miss
// it and the install button would simply never appear.
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

let promptEvent: InstallPromptEvent | null = null;
// Set by the `appinstalled` event. Needed separately from display-mode below
// because installing from a normal tab leaves that tab a normal tab - the
// page must stop offering an install it has just received, but display-mode
// still reports "browser" until it is reopened from the home screen.
let justInstalled = false;

if (typeof window !== "undefined") {
  // Chromium fires this INSTEAD of showing its own install banner, and only
  // when the app is actually installable - so capturing it is the only way to
  // get a button, and its absence is a reliable "this browser has none to
  // offer". preventDefault suppresses the mini-infobar so we own the moment.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event as InstallPromptEvent;
    emit();
  });
  // Fires after an install completes by ANY route, including Chrome's own
  // menu - not just our button.
  window.addEventListener("appinstalled", () => {
    justInstalled = true;
    promptEvent = null;
    emit();
  });
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // The installed app runs in its own window with no browser UI, which is what
  // display-mode reports. Watching it (rather than reading it once) covers the
  // case of a devotee following the steps in one window while this page is
  // open in another.
  const standalone = window.matchMedia("(display-mode: standalone)");
  standalone.addEventListener("change", callback);
  return () => {
    listeners.delete(callback);
    standalone.removeEventListener("change", callback);
  };
}

/** Cached: the answer cannot change within a session, and useSyncExternalStore
 * calls this on every render. */
let cachedPlatform: Platform | null = null;
function getPlatformSnapshot(): Platform | null {
  cachedPlatform ??= detectPlatform();
  return cachedPlatform;
}

function getInstalledSnapshot(): boolean {
  return (
    justInstalled ||
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS predates the display-mode standard and answers through this
    // non-standard navigator flag instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getPromptSnapshot(): InstallPromptEvent | null {
  return promptEvent;
}

// Neutral server snapshots: no platform known, not installed, no prompt.
// That combination renders exactly the plain three-card page.
const noPlatform = () => null;
const notInstalled = () => false;

/**
 * Wraps the server-rendered platform cards (passed straight through as
 * `children`, the codebase's RSC children-as-props pattern) and does three
 * browser-only jobs: float the card matching this device to the top, offer
 * the real install button where Chromium gives us one, and say so plainly
 * when Goloka is already installed.
 *
 * It never picks WHICH cards exist. The page is complete and correct with
 * JavaScript disabled and before hydration - see DESIGN.md #6.
 */
export function InstallGuide({ children }: { children: React.ReactNode }) {
  const t = useTranslations("pages.install");
  const platform = useSyncExternalStore(subscribe, getPlatformSnapshot, noPlatform);
  const installed = useSyncExternalStore(subscribe, getInstalledSnapshot, notInstalled);
  const prompt = useSyncExternalStore(subscribe, getPromptSnapshot, noPlatform);

  return (
    <>
      {installed && (
        <p className="install-installed" role="status">
          {t("alreadyInstalled")}
        </p>
      )}

      {prompt && !installed && (
        <button
          type="button"
          // The site's existing gold CTA (globals.css .btn.gold) - this is the
          // same kind of act as "Begin here"; .install-button only spaces it.
          className="btn gold install-button"
          onClick={() => {
            // A captured prompt can only be shown once, so it is dropped
            // either way. We deliberately don't read the outcome: "dismissed"
            // is not a failure, and `appinstalled` is what tells us it worked.
            void prompt.prompt();
            promptEvent = null;
            emit();
          }}
        >
          {t("installNow")}
        </button>
      )}

      {/* data-platform is the whole mechanism: globals.css lifts the matching
          card with order:-1 and warms its border. Null until the store reports
          in, so the server's document order survives first paint. */}
      <div className="install-cards" data-platform={platform ?? undefined}>
        {children}
      </div>
    </>
  );
}
