// Pure, on-device parser that counts completed Hare Kṛṣṇa mahā-mantras from
// a speech-to-text transcript. This file has NO side effects and touches no
// browser API - it is the one piece of the voice-counting pipeline (see
// lib/voice-japa.ts, which drives on-device Whisper) precise enough to unit
// test well, and it carries the actual counting logic so the pipeline
// module can stay a thin wrapper around getUserMedia + the model.
//
// Whisper's guesses on fast, repetitive devotional audio are messy -
// "kṛṣṇa" comes back as "krsna"/"krishnaa"/"krisna", "hare" as
// "hari"/"haray", "rama" as "ram"/"raam" - and words are sometimes dropped
// or run together with no spaces at all when speech is fast. This parser is
// deliberately forgiving about SPELLING but strict about VOLUME: it counts
// holy-name tokens loosely, then divides by 16 (the exact word count of one
// mahā-mantra - Hare x8, Kṛṣṇa x4, Rāma x4, see chant-space.tsx's
// MANTRA_ROMAN) and FLOORS the result. Flooring is the whole under-count
// bias the owner asked for: a devotee whose matched tokens add up to 16.9
// "mantras" worth is told 16, never 17 - the app should always lag a
// devotee's real effort, never flatter it.

export const MANTRA_WORD_COUNT = 16; // Hare x8 + Kṛṣṇa x4 + Rāma x4

export type HolyNameToken = "hare" | "krishna" | "rama";

// Fuzzy patterns, one per holy name. Each starts with a different letter
// (h / k / r) so there is never real ambiguity about which pattern a match
// belongs to. Patterns are deliberately loose about vowels/trailing sounds
// (the part Whisper gets wrong on repetitive audio) but still anchored
// enough that they rarely swallow an unrelated word - false NEGATIVES (a
// real utterance not matched) are fine, since they only slow the count
// down; false POSITIVES on ordinary words are the risk to control.
//
// Known, accepted tolerance trade-off: RAMA_RE will match "rama"/"ram" as a
// SUBSTRING of unrelated words that happen to contain it (e.g. "program",
// "drama") - during focused chanting this essentially never comes up, and
// the floor-division below already biases every count downward, so an
// occasional stray match costs at most a slower count, never a false
// "round complete".
// "har" + one trailing vowel (a/e/i) + optional y - matches hare, hara,
// hari, haray, harey. Anchored on the literal "har" (not, say, "h[ae]r")
// deliberately: an earlier looser draft that allowed "her" too matched
// ordinary English words like "there"/"here" mid-sentence, which is exactly
// the false-positive risk this file is meant to avoid.
const HARE_RE = /har[aei]y?/y;
// k + up to 2 filler letters (absorbs a dropped/extra vowel or consonant)
// + s + optional h + n + one-or-more a. Matches krishna, krsna, krishnaa,
// krsnaa, krishnaaa, ...
const KRISHNA_RE = /k[a-z]{0,2}sh?na+/y;
// r + one-or-more a + one-or-more m + zero-or-more a. Matches ram, rama,
// raam, raama, ...
const RAMA_RE = /ra+m+a*/y;

/** Strips Sanskrit diacritics (ā ī ū ṛ ṇ ṣ ś ñ ...) down to plain ASCII
 * letters via Unicode NFD decomposition (each diacritic is a combining mark
 * over a base letter, so stripping combining marks handles all of them
 * generically), lowercases, and drops every character that isn't a-z
 * (spaces, punctuation, digits, emoji). So "Kṛṣṇa,", "krishna" and
 * "KRISHNA!!" all normalize to the same letter stream before matching, and
 * - just as importantly - a transcript with normal spacing and a
 * run-together transcript with none normalize to the SAME shape, which is
 * what lets one scanner (below) handle both. */
export function normalizeToLetters(transcript: string): string {
  return transcript
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks (ā ī ū ṛ ṇ ṣ ś ñ ...)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Scans an already-normalized (lowercase, letters-only, no spaces) string
 * left-to-right for holy-name tokens, greedily matching the longest run at
 * each position and skipping one character at a time wherever nothing
 * matches (a stray word, filler speech). Because spaces were already
 * stripped by normalizeToLetters, a cleanly-spaced transcript and a
 * run-on-with-no-spaces transcript are scanned identically. */
export function tokenizeFromLetters(letters: string): HolyNameToken[] {
  const tokens: HolyNameToken[] = [];
  let i = 0;
  while (i < letters.length) {
    HARE_RE.lastIndex = i;
    KRISHNA_RE.lastIndex = i;
    RAMA_RE.lastIndex = i;
    const hare = HARE_RE.exec(letters);
    const krishna = KRISHNA_RE.exec(letters);
    const rama = RAMA_RE.exec(letters);
    // At most one of these can match at a given position, since the
    // patterns start with different letters - no "best match" tie-break
    // needed.
    const match = hare ?? krishna ?? rama;
    if (match) {
      tokens.push(hare ? "hare" : krishna ? "krishna" : "rama");
      i += match[0].length;
    } else {
      i += 1;
    }
  }
  return tokens;
}

/** Convenience wrapper: normalize a raw transcript, then tokenize it. */
export function tokenizeHolyNames(transcript: string): HolyNameToken[] {
  return tokenizeFromLetters(normalizeToLetters(transcript));
}

/** Counts completed mahā-mantras in a transcript: every 16 fuzzily-matched
 * holy-name tokens is one mantra, rounded DOWN (see file banner). This is a
 * token-count heuristic, not a strict check of the
 * Hare-Hare-Kṛṣṇa-Kṛṣṇa/... cyclic order - live speech legitimately varies
 * (a repeated word, a half-second stumble) and the goal is a steady, honest
 * count, not a grammar check. */
export function countMantras(transcript: string): number {
  return Math.floor(tokenizeHolyNames(transcript).length / MANTRA_WORD_COUNT);
}

// The overlap-strip search is capped at this many letters - deliberately
// SMALL, and this is the important tuning knob in the whole file. It must
// stay close to how much a devotee could plausibly say during the
// recording overlap itself (lib/voice-japa.ts overlaps consecutive
// windows by ~1.5s specifically so a mantra spoken right at a window
// boundary is never split by silence) - roughly 1.5s x ~3 words/s x ~4.75
// average letters/holy-name-word ~= 21 letters, rounded up for slack.
// A LARGER cap would look tempting ("catch more duplicate transcription"),
// but the mahā-mantra repeats the same few words constantly by its very
// nature - "Hare Hare" and "Krishna Krishna Krishna" appear inside a
// SINGLE mantra - so a generous cap would routinely mistake a devotee's
// genuine next repetition for re-transcribed overlap and silently eat it.
// Keeping the cap tight to the real overlap duration is what keeps that
// failure mode rare instead of routine; the rare case that slips through
// still only causes a slight UNDER-count, which is the accepted bias
// throughout this file.
export const OVERLAP_CAP_LETTERS = 24;

/** Given the normalized letters of the PREVIOUS recording window's
 * transcript and the normalized letters of the CURRENT window's
 * transcript, returns the suffix of `incoming` that is genuinely new - the
 * overlap-dedup step. Looks for the LONGEST matching overlap within
 * `maxOverlapLetters` (default OVERLAP_CAP_LETTERS, see its comment for why
 * the cap must stay small) so a longer coincidental match - the devotee
 * genuinely repeating themselves, not the real recording seam - never
 * wrongly eats real chanting. */
export function stripOverlapLetters(
  previous: string,
  incoming: string,
  maxOverlapLetters: number = OVERLAP_CAP_LETTERS
): string {
  const maxOverlap = Math.min(previous.length, incoming.length, maxOverlapLetters);
  for (let len = maxOverlap; len > 0; len--) {
    if (previous.slice(-len) === incoming.slice(0, len)) {
      return incoming.slice(len);
    }
  }
  return incoming;
}

/** Rolling state the voice pipeline carries across recording windows - see
 * applyTranscriptWindow. Plain data, not a class, matching this codebase's
 * read/write-a-plain-object idiom elsewhere (lib/rounds.ts's RoundsState). */
export type MantraCounterState = {
  previousLetters: string;
  totalTokens: number;
  mantrasReported: number;
};

export function createMantraCounterState(): MantraCounterState {
  return { previousLetters: "", totalTokens: 0, mantrasReported: 0 };
}

/** Feeds one Whisper window's transcript into the rolling counter. Returns
 * the next state to carry forward AND how many NEW complete mantras this
 * window pushed the count over (almost always 0 - a window is a few
 * seconds, a mantra takes much longer than that to chant aloud). Pure and
 * mutates nothing, so the browser-facing pipeline (lib/voice-japa.ts) can
 * hold the state in a ref and this reducer stays fully unit-testable
 * without a mic or a model. */
export function applyTranscriptWindow(
  state: MantraCounterState,
  transcript: string
): { state: MantraCounterState; newMantras: number } {
  const incomingLetters = normalizeToLetters(transcript);
  const freshLetters = stripOverlapLetters(state.previousLetters, incomingLetters);
  const newTokenCount = tokenizeFromLetters(freshLetters).length;
  const totalTokens = state.totalTokens + newTokenCount;
  const mantrasSoFar = Math.floor(totalTokens / MANTRA_WORD_COUNT);
  const newMantras = mantrasSoFar - state.mantrasReported;

  return {
    state: { previousLetters: incomingLetters, totalTokens, mantrasReported: mantrasSoFar },
    newMantras,
  };
}
