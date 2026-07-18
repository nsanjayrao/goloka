import { useSyncExternalStore } from "react";

// "Data saver" mode: a visitor-controlled preference that trims real
// kilobytes off every page load - the watch page's YouTube player becomes
// tap-to-load, thumbnails and the hero image drop to a smaller encode, and
// the hero's ember canvas is skipped. Same no-tracking stance as Continue
// Watching / Recent Searches: stored ONLY in this browser's localStorage,
// never sent to or read by the server.
//
// Two keys, matching the two questions that matter: what's the value, and
// has the visitor ever actually chosen it? Auto-detection (below) only
// gets a say while the second is "no" - the moment someone flips the
// footer switch either way, that choice sticks and auto-detection never
// overrides it again.
const STORAGE_KEY = "goloka:data-saver";
const EXPLICIT_KEY = "goloka:data-saver:explicit";

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

/** useSyncExternalStore subscribe: same-tab writes (via emit, since a
 * same-tab localStorage write doesn't fire the "storage" event) AND
 * other-tab writes (the real storage event) - so every open tab agrees
 * the moment the switch is flipped anywhere. */
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** True when the Network Information API signals a slow/constrained link.
 * Chrome/Android only - Safari and Firefox never shipped `navigator
 * .connection` - so this is a bonus default, never something depended on.
 * Reads happen entirely in the browser and nothing is transmitted; this is
 * only ever used to pick a sensible starting value locally. Never throws:
 * some runtimes have no `navigator` (SSR, this file's own tests) or no
 * `.connection` at all. */
function connectionPrefersDataSaver(): boolean {
  try {
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const conn = nav.connection;
    if (!conn) return false;
    if (conn.saveData === true) return true;
    return conn.effectiveType === "2g" || conn.effectiveType === "slow-2g";
  } catch {
    return false;
  }
}

/** The raw snapshot string driving useSyncExternalStore: "1"/"0" once the
 * visitor has explicitly chosen, or "" while they haven't - keeping the
 * store's snapshot a plain string (not a freshly-computed boolean) so
 * repeated calls compare equal via Object.is when nothing changed. Never
 * throws: a disabled/blocked localStorage just means no explicit choice,
 * same as a first-time visitor. */
export function getDataSaverSnapshot(): string {
  try {
    if (localStorage.getItem(EXPLICIT_KEY) !== "1") return "";
    return localStorage.getItem(STORAGE_KEY) === "1" ? "1" : "0";
  } catch {
    return "";
  }
}

/** SSR/first paint has no localStorage and no navigator.connection to
 * consult - "0" (off) is the only value that can't cause a hydration
 * mismatch. A slow connection still gets data-saver moments after mount,
 * once useDataSaver's client-only snapshot takes over (same pattern as
 * recently-watched.ts / recent-searches.ts). */
export function getDataSaverServerSnapshot(): string {
  return "0";
}

/** "1"/"0" is an explicit choice, read literally. "" means no explicit
 * choice yet, so the connection signal (if any) decides the default. */
export function parseDataSaverSnapshot(raw: string): boolean {
  if (raw === "1") return true;
  if (raw === "0") return false;
  return connectionPrefersDataSaver();
}

/** Persists an explicit choice - this is what the footer switch calls.
 * Once called, auto-detection never overrides the value again (see the
 * file banner). Never throws: storage unavailable/full just means the
 * choice won't survive a reload, not a broken toggle. */
export function setDataSaver(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    localStorage.setItem(EXPLICIT_KEY, "1");
    emit();
  } catch {
    // ignore - see above.
  }
}

/** Reads the current data-saver state: the visitor's explicit choice if
 * they've ever touched the footer switch, otherwise auto-detected from
 * `navigator.connection` (never sent anywhere - see the file banner).
 * Every consumer (LiteEmbed, Thumbnail, HeroImage, DataSaverToggle) calls
 * this rather than reading localStorage itself, so they all agree. */
export function useDataSaver(): boolean {
  const raw = useSyncExternalStore(subscribe, getDataSaverSnapshot, getDataSaverServerSnapshot);
  return parseDataSaverSnapshot(raw);
}
