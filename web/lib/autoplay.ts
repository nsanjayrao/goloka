import { useSyncExternalStore } from "react";

// "Continue to the next video": a visitor-controlled preference for the
// watch page - when a video ends, Goloka offers (then performs) a move to
// the next one. OFF by default: continuing is a choice the devotee makes,
// never something the site does to them. Same no-tracking stance as
// data-saver.ts: stored ONLY in this browser's localStorage, never sent to
// or read by the server, and the same useSyncExternalStore idiom so every
// consumer (and every open tab) agrees the moment it is toggled.
const STORAGE_KEY = "goloka:autoplay";

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

/** Same-tab writes (via emit - a same-tab localStorage write doesn't fire
 * the "storage" event) AND other-tab writes (the real storage event). */
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function getAutoplaySnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1" ? "1" : "0";
  } catch {
    return "0";
  }
}

/** SSR has no localStorage - "0" (off) is also the correct default: the
 * player API script and any auto-advance only ever exist after an explicit
 * opt-in, so the server's answer and the first client render agree. */
export function getAutoplayServerSnapshot(): string {
  return "0";
}

/** Persists the choice. Never throws: unavailable storage just means the
 * toggle won't survive a reload, not a broken switch. */
export function setAutoplay(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    emit();
  } catch {
    // ignore - see above.
  }
}

/** Whether the visitor has chosen to continue to the next video when one
 * ends. False on the server and the first client render (hydration-safe),
 * then live from localStorage. */
export function useAutoplay(): boolean {
  return useSyncExternalStore(subscribe, getAutoplaySnapshot, getAutoplayServerSnapshot) === "1";
}
