import { useSyncExternalStore } from "react";

// "Content language": a visitor-controlled preference ("show me more in my
// language") that drives one home page shelf (components/language-shelf.tsx)
// toward videos whose `language` column (worker/sync.py's normalize_language)
// matches. Same no-tracking stance as Continue Watching / Data saver: stored
// ONLY in this browser's localStorage, never sent to or read by the server -
// the home page stays one ISR-cached render for every visitor; this shelf
// materializes client-side after mount for whoever has a preference set.
const STORAGE_KEY = "goloka:content-language";

/** The languages offered by the picker chips (components/language-picker.tsx):
 * `value` is the canonical name stored and matched against the `language`
 * column (must exactly match worker/sync.py's LANGUAGE_ALIASES targets),
 * `label` is how the language names itself, native-script. Single source of
 * truth so the picker's chips and the shelf's row title never drift apart.
 *
 * ORDERED BY CATALOGUE SIZE, and this list must be RE-CHECKED whenever the
 * worker's language classification changes. It went stale exactly that way:
 * before 2026-08-01 the `language` column came only from the LLM classifier
 * and 59% of rows were NULL, so the list below was written against whatever
 * had happened to be classified. The backfill took coverage to 94% and this
 * list was not revisited - leaving Korean (398) and Telugu (342) unoffered
 * while Tamil (9) had a chip. Telugu was the sharpest: six Telugu channels
 * were added the same week for devotees the picker could not serve.
 *
 * Counts at 2026-08-03, of 16,946 videos:
 *   English 12,064 · Hindi 2,163 · Spanish 528 · Korean 398 · Telugu 342
 *   Russian 299 · Bengali 68 · Portuguese 53 · Tamil 9
 *
 * Tamil stays despite its nine: a devotee who reads Tamil is better served by
 * a chip that finds nine lectures than by no chip at all, and the count will
 * grow the moment a Tamil channel is curated. The floor for inclusion is "a
 * real audience exists", not a threshold. */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "हिन्दी" },
  { value: "Spanish", label: "Español" },
  { value: "Korean", label: "한국어" },
  { value: "Telugu", label: "తెలుగు" },
  { value: "Russian", label: "Русский" },
  { value: "Bengali", label: "বাংলা" },
  { value: "Portuguese", label: "Português" },
  { value: "Tamil", label: "தமிழ்" },
];

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

/** useSyncExternalStore subscribe: same-tab writes (via emit, since a
 * same-tab localStorage write doesn't fire the "storage" event) AND
 * other-tab writes (the real storage event) - mirrors data-saver.ts. */
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** The raw snapshot string driving useSyncExternalStore: the stored language
 * name, or "" when no preference is set - keeping the snapshot a plain
 * string (not a freshly-computed value) so repeated calls compare equal via
 * Object.is when nothing changed. Never throws: a disabled/blocked
 * localStorage just means no preference, same as a first-time visitor. */
export function getContentLanguageSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** SSR/first paint has no localStorage - "" (no preference) is the only
 * value that can't cause a hydration mismatch. The real preference (if any)
 * takes over moments after mount, once useContentLanguage's client-only
 * snapshot runs (same pattern as recently-watched.ts / data-saver.ts). */
export function getContentLanguageServerSnapshot(): string {
  return "";
}

/** "" means no preference; anything else is read literally as the stored
 * canonical language name. */
export function parseContentLanguageSnapshot(raw: string): string | null {
  return raw === "" ? null : raw;
}

/** Persists (or clears, with `null`) the visitor's language preference - what
 * the picker chips call. Never throws: storage unavailable/full just means
 * the choice won't survive a reload, not a broken picker. */
export function setContentLanguage(language: string | null): void {
  try {
    if (language === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, language);
    }
    emit();
  } catch {
    // ignore - see above.
  }
}

/** Reads the visitor's current language preference, or null if they've never
 * set one. Every consumer (LanguagePicker, LanguageShelf) calls this rather
 * than reading localStorage itself, so they all agree instantly - including
 * across two instances in the same tab, via `emit()`. */
export function useContentLanguage(): string | null {
  const raw = useSyncExternalStore(subscribe, getContentLanguageSnapshot, getContentLanguageServerSnapshot);
  return parseContentLanguageSnapshot(raw);
}
