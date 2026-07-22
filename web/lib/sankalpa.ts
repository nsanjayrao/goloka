import { useSyncExternalStore } from "react";

// Sankalpa - the devotee's OWN daily vow of rounds (4, 8, or the classic
// 16). The one "goal" mechanic that fits this product's mood, precisely
// because the vow is the devotee's and not the app's: there is no default,
// no prompt to set one, no nudge to raise it, and no failure state anywhere
// - when a day falls short the interfaces simply say nothing. Stored ONLY
// in this browser's localStorage (same no-tracking stance and same
// useSyncExternalStore idiom as lib/autoplay.ts / lib/data-saver.ts);
// releasing the vow is one tap and leaves no trace.
const STORAGE_KEY = "goloka:sankalpa";

/** The offered choices - a house of japa's traditional daily counts. */
export const SANKALPA_CHOICES = [4, 8, 16] as const;

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function getSankalpaSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** SSR has no localStorage - "" (no vow) matches a devotee who never set
 * one, so hydration never mismatches. */
export function getSankalpaServerSnapshot(): string {
  return "";
}

/** The vow a raw snapshot holds, or null for none. Strict on purpose: only
 * a whole number of rounds a human could actually vow (1..108) counts -
 * anything else (an empty string, a stray write, "abc") is simply no vow,
 * never an error. */
export function parseSankalpaSnapshot(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 108) return null;
  return n;
}

/** Sets or releases (null) the vow. Never throws - unavailable storage
 * just means the vow won't survive a reload. */
export function setSankalpa(rounds: number | null): void {
  try {
    if (rounds === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(rounds));
    }
    emit();
  } catch {
    // ignore - see above.
  }
}

/** The devotee's current vow, or null when none is set. */
export function useSankalpa(): number | null {
  const raw = useSyncExternalStore(subscribe, getSankalpaSnapshot, getSankalpaServerSnapshot);
  return parseSankalpaSnapshot(raw);
}
