import { useSyncExternalStore } from "react";

// The chant space's mantra registry (see components/chant-space.tsx and
// lib/japa-rhythm.ts). Each mantra is broken into WORDS - the units that
// light up one at a time as a devotee chants (see japa-rhythm.ts's vocal-
// onset/mantra-boundary events and chant-space.tsx's karaoke stepping) -
// plus a minMantraMs, the rhythm counter's minimum-voiced-phrase floor
// (lib/japa-rhythm.ts's MIN_PHRASE_MS, but per-mantra rather than a single
// global constant). A short mantra needs a shorter floor than the sixteen-
// word mahā-mantra, or a devotee chanting it briskly would be undercounted
// - see pushAudioFrame's `minPhraseMs` parameter.
export type Mantra = {
  id: string;
  /** Display name - liturgical, fixed across every locale, the same way
   * chant-space.tsx's mahā-mantra text already is (see its file comment):
   * this is Sanskrit, not site copy, and belongs to every devotee
   * regardless of the browser's language setting. */
  name: string;
  /** A short label for the compact selector switch (the full `name` can be
   * long). Also fixed/liturgical, never translated. */
  shortName: string;
  /** The mantra broken into the units that light up in sequence. */
  words: string[];
  /** Optional Devanagari rendering, shown gracefully beneath the roman
   * words - decorative (lang set, aria-hidden), the roman line already
   * carries the accessible name. */
  devanagari?: string;
  /** The rhythm counter's minimum voiced-phrase duration for THIS mantra. */
  minMantraMs: number;
  /** A typical time to chant this whole mantra once, in ms - the SEED tempo
   * for the karaoke word-flow before it has measured the devotee's own pace
   * (lib/japa-rhythm.ts's KaraokeFlow learns and overrides this within a
   * mantra or two). Unlike minMantraMs (a hard floor for COUNTING), this is
   * just a comfortable starting pace for the word-lighting. */
  karaokeMs: number;
  /** 0-indexed word positions AFTER which a visual line break falls, for
   * mantras whose traditional layout is more than one line (e.g. the
   * mahā-mantra's two lines of eight words). Purely presentational -
   * chant-space.tsx renders one flowing line when this is omitted. */
  lineBreakAfter?: number[];
  /** 0-indexed word positions AFTER which a comma falls in the roman
   * rendering (e.g. "Hare Kṛṣṇa Hare Kṛṣṇa," before "Kṛṣṇa Kṛṣṇa Hare
   * Hare"). Purely presentational, like lineBreakAfter. */
  commaAfter?: number[];
};

export const MAHAMANTRA: Mantra = {
  id: "mahamantra",
  name: "Hare Kṛṣṇa mahā-mantra",
  shortName: "Mahā-mantra",
  words: [
    "Hare",
    "Kṛṣṇa",
    "Hare",
    "Kṛṣṇa",
    "Kṛṣṇa",
    "Kṛṣṇa",
    "Hare",
    "Hare",
    "Hare",
    "Rāma",
    "Hare",
    "Rāma",
    "Rāma",
    "Rāma",
    "Hare",
    "Hare",
  ],
  devanagari: "हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे । हरे राम हरे राम, राम राम हरे हरे ॥",
  // Matches lib/japa-rhythm.ts's MIN_PHRASE_MS exactly - this constant IS
  // that value, now expressed per-mantra so a second, shorter mantra
  // doesn't have to share its floor.
  minMantraMs: 2500,
  // ~5.5s for the full sixteen words is an unhurried, even pace (~340ms a
  // word) - a natural seed; the flow adapts to the devotee's real tempo
  // after the first mantra.
  karaokeMs: 5500,
  lineBreakAfter: [7],
  commaAfter: [3, 11],
};

// The Śrī Rādhā mantra: Her name, called again and again - as the followers
// of Premānanda Mahārāja chant it in Vṛndāvana. One completed "Śrī Rādhā Śrī
// Rādhā" counts as one bead. (Owner-confirmed text and word-breakdown; the
// diacritics - Ś, ā - are preserved exactly and are liturgical, never
// translated.)
export const RADHA_MANTRA: Mantra = {
  id: "sri-radha",
  name: "Śrī Rādhā",
  shortName: "Śrī Rādhā",
  words: ["Śrī", "Rādhā", "Śrī", "Rādhā"],
  devanagari: "श्री राधा श्री राधा",
  // Four short words - a lower floor than the mahā-mantra's 2500ms, or a
  // brisk chanter would be undercounted. Chosen by the same "comfortably
  // above a stray word, comfortably under a real recitation" reasoning as
  // MIN_PHRASE_MS itself.
  minMantraMs: 1500,
  // ~2.2s for "Śrī Rādhā Śrī Rādhā" (~550ms a word) - Her name called
  // gently, twice; adapts to the devotee's pace after the first repetition.
  karaokeMs: 2200,
};

export const MANTRAS: Mantra[] = [MAHAMANTRA, RADHA_MANTRA];

export function getMantra(id: string): Mantra {
  return MANTRAS.find((mantra) => mantra.id === id) ?? MAHAMANTRA;
}

// The visitor's chosen mantra persists on-device only, the same no-
// tracking idiom as lib/data-saver.ts / lib/rounds.ts: localStorage,
// never sent to or read by the server.
const STORAGE_KEY = "goloka:chant-mantra";

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

/** The raw snapshot string driving useSyncExternalStore - a mantra id, or
 * "" when nothing has been chosen yet (parsed to the default mahā-mantra
 * by parseMantraIdSnapshot). Never throws. */
export function getMantraIdSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** SSR/first paint has no localStorage - "" parses to the default
 * mahā-mantra, exactly what a first-time visitor sees, so no special-
 * casing is needed where useSelectedMantra is used. */
export function getMantraIdServerSnapshot(): string {
  return "";
}

export function parseMantraIdSnapshot(raw: string): Mantra {
  return getMantra(raw);
}

/** Persists the visitor's chosen mantra. Never throws: storage
 * unavailable/full just means the choice won't survive a reload, not a
 * broken selector. */
export function setSelectedMantraId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    emit();
  } catch {
    // ignore - see above.
  }
}

/** The visitor's currently selected mantra, live-updated across tabs. */
export function useSelectedMantra(): Mantra {
  const raw = useSyncExternalStore(subscribe, getMantraIdSnapshot, getMantraIdServerSnapshot);
  return parseMantraIdSnapshot(raw);
}
