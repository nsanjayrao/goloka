import { describe, expect, it } from "vitest";

import {
  applyTranscriptWindow,
  countMantras,
  createMantraCounterState,
  MANTRA_WORD_COUNT,
  normalizeToLetters,
  OVERLAP_CAP_LETTERS,
  stripOverlapLetters,
  tokenizeFromLetters,
  tokenizeHolyNames,
} from "./mantra-count";

// One clean mahā-mantra, exactly as chant-space.tsx's MANTRA_ROMAN renders
// it - Hare x8, Kṛṣṇa x4, Rāma x4, 16 words total.
const CLEAN_MANTRA =
  "Hare Krishna Hare Krishna, Krishna Krishna Hare Hare, Hare Rama Hare Rama, Rama Rama Hare Hare";

describe("MANTRA_WORD_COUNT", () => {
  it("is 16 - Hare x8 + Kṛṣṇa x4 + Rāma x4", () => {
    expect(MANTRA_WORD_COUNT).toBe(16);
  });
});

describe("normalizeToLetters", () => {
  it("lowercases, strips punctuation/spaces, and strips Sanskrit diacritics via NFD", () => {
    expect(normalizeToLetters("Hare Kṛṣṇa!")).toBe("harekrsna");
    expect(normalizeToLetters("KRISHNA")).toBe("krishna");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeToLetters("")).toBe("");
  });

  it("drops digits and emoji", () => {
    expect(normalizeToLetters("hare 🙏 108 krishna")).toBe("harekrishna");
  });
});

describe("tokenizeHolyNames - clean transcript", () => {
  it("finds all 16 tokens in one clean mantra, in the correct cyclic order", () => {
    const tokens = tokenizeHolyNames(CLEAN_MANTRA);
    expect(tokens).toEqual([
      "hare",
      "krishna",
      "hare",
      "krishna",
      "krishna",
      "krishna",
      "hare",
      "hare",
      "hare",
      "rama",
      "hare",
      "rama",
      "rama",
      "rama",
      "hare",
      "hare",
    ]);
  });
});

describe("tokenizeHolyNames - misspellings Whisper is known to produce", () => {
  it("matches krishna variants: krsna, krishnaa, Krishnaa", () => {
    expect(tokenizeHolyNames("krsna")).toEqual(["krishna"]);
    expect(tokenizeHolyNames("krishnaa")).toEqual(["krishna"]);
    expect(tokenizeHolyNames("Krishnaa")).toEqual(["krishna"]);
  });

  it("matches hare variants: hari, haray, harey", () => {
    expect(tokenizeHolyNames("hari")).toEqual(["hare"]);
    expect(tokenizeHolyNames("haray")).toEqual(["hare"]);
    expect(tokenizeHolyNames("harey")).toEqual(["hare"]);
  });

  it("matches rama variants: ram, raam, raama", () => {
    expect(tokenizeHolyNames("ram")).toEqual(["rama"]);
    expect(tokenizeHolyNames("raam")).toEqual(["rama"]);
    expect(tokenizeHolyNames("raama")).toEqual(["rama"]);
  });

  it("counts a full mantra even when every word is misspelled", () => {
    const messy = "haray krsna haray krsna krsna krsna haray haray haray raam haray raam raam raam haray haray";
    expect(countMantras(messy)).toBe(1);
  });
});

describe("tokenizeHolyNames - run-on transcript with no spaces", () => {
  it("still tokenizes correctly when Whisper drops all spacing", () => {
    const runOn = CLEAN_MANTRA.replace(/[^a-zA-Z]/g, "").toLowerCase();
    expect(tokenizeHolyNames(runOn)).toHaveLength(16);
    expect(countMantras(runOn)).toBe(1);
  });

  it("tokenizes two concatenated mantras with no separators as 32 tokens / 2 mantras", () => {
    const runOn = (CLEAN_MANTRA + CLEAN_MANTRA).replace(/[^a-zA-Z]/g, "").toLowerCase();
    expect(tokenizeHolyNames(runOn)).toHaveLength(32);
    expect(countMantras(runOn)).toBe(2);
  });
});

describe("tokenizeHolyNames - mixed with a stray, unrelated word", () => {
  it("ignores an interjected stray word and still counts the surrounding holy names", () => {
    const withStray = "Hare Krishna Hare Krishna Krishna Krishna Hare Hare phone Hare Rama Hare Rama Rama Rama Hare Hare";
    expect(tokenizeHolyNames(withStray)).toHaveLength(16);
    expect(countMantras(withStray)).toBe(1);
  });

  it("a lone stray word with no holy names present tokenizes to nothing", () => {
    // "there"/"here" deliberately do NOT match hare - see HARE_RE's comment
    // on why the pattern is anchored to literal "har", not "h[ae]r".
    expect(tokenizeHolyNames("hello there, how are you today")).toEqual([]);
  });
});

describe("countMantras - dropped words / under-count bias", () => {
  it("a transcript missing 2 of 16 words does not complete a mantra (floors, never rounds up)", () => {
    // 14 words - Krishna line intact, Rama line missing its first two words.
    const dropped = "Hare Krishna Hare Krishna Krishna Krishna Hare Hare Rama Rama Rama Hare Hare";
    expect(tokenizeHolyNames(dropped)).toHaveLength(13);
    expect(countMantras(dropped)).toBe(0);
  });

  it("31 tokens (one mantra plus 15 more) is reported as 1, never 2 - the explicit floor bias", () => {
    const oneAndAHalf = Array(31).fill("hare").join(" ");
    expect(tokenizeHolyNames(oneAndAHalf)).toHaveLength(31);
    expect(countMantras(oneAndAHalf)).toBe(1);
  });

  it("exactly 16 tokens completes exactly 1 mantra", () => {
    const exact = Array(16).fill("krishna").join(" ");
    expect(countMantras(exact)).toBe(1);
  });

  it("15 tokens (one short) completes 0 mantras", () => {
    const short = Array(15).fill("rama").join(" ");
    expect(countMantras(short)).toBe(0);
  });
});

describe("countMantras - empty and whitespace-only input", () => {
  it("returns 0 for an empty string", () => {
    expect(countMantras("")).toBe(0);
  });

  it("returns 0 for whitespace-only input", () => {
    expect(countMantras("   \n\t  ")).toBe(0);
  });

  it("tokenizeFromLetters returns an empty array for an empty string", () => {
    expect(tokenizeFromLetters("")).toEqual([]);
  });
});

describe("stripOverlapLetters", () => {
  it("strips a genuine overlap between the end of previous and the start of incoming", () => {
    expect(stripOverlapLetters("xxxhare", "hareyyy")).toBe("yyy");
  });

  it("returns incoming unchanged when there is no overlap at all", () => {
    expect(stripOverlapLetters("abc", "def")).toBe("def");
  });

  it("returns incoming unchanged when previous is empty (first window)", () => {
    expect(stripOverlapLetters("", "harekrishna")).toBe("harekrishna");
  });

  it("picks the LONGEST possible overlap, not just any match", () => {
    // "a" trivially overlaps at length 1, but the true seam is "ahare".
    expect(stripOverlapLetters("xyzahare", "aharenew")).toBe("new");
  });

  it("caps the overlap search (default OVERLAP_CAP_LETTERS) so a long coincidental match doesn't eat real chanting", () => {
    const long = OVERLAP_CAP_LETTERS + 50;
    const previous = "a".repeat(long);
    const incoming = "a".repeat(long) + "krishna";
    // Only the last OVERLAP_CAP_LETTERS letters of `previous` are
    // considered, so at most that many leading letters of `incoming` are
    // stripped - never the whole run of "a"s.
    const result = stripOverlapLetters(previous, incoming);
    expect(result.endsWith("krishna")).toBe(true);
    expect(result.length).toBe(incoming.length - OVERLAP_CAP_LETTERS);
  });

  it("accepts an explicit maxOverlapLetters override", () => {
    expect(stripOverlapLetters("xxxhare", "hareyyy", 2)).toBe("hareyyy"); // overlap (4) exceeds the 2-letter cap
    expect(stripOverlapLetters("xxxhare", "hareyyy", 10)).toBe("yyy");
  });
});

describe("applyTranscriptWindow - the rolling reducer voice-japa.ts drives", () => {
  it("starts at 0 mantras with a fresh state", () => {
    const state = createMantraCounterState();
    expect(state).toEqual({ previousLetters: "", totalTokens: 0, mantrasReported: 0 });
  });

  it("reports 1 new mantra once a single window's transcript contains all 16 tokens", () => {
    const state = createMantraCounterState();
    const result = applyTranscriptWindow(state, CLEAN_MANTRA);
    expect(result.newMantras).toBe(1);
    expect(result.state.mantrasReported).toBe(1);
  });

  it("does not double-count an overlapping tail re-transcribed at the start of the next window", () => {
    // Window 1: the first mantra plus the first 3 words of the next
    // repetition ("Hare Krishna Hare", CLEAN_MANTRA's own opening) - the
    // overlap. Window 2 RE-transcribes that same opening (the whole point
    // of recording overlapping windows, see OVERLAP_CAP_LETTERS) before
    // continuing - so window 2's transcript is just the second mantra in
    // full, starting from the words window 1 already heard the start of.
    let state = createMantraCounterState();
    const window1 = CLEAN_MANTRA + " Hare Krishna Hare"; // 16 + 3 tokens
    let result = applyTranscriptWindow(state, window1);
    expect(result.newMantras).toBe(1);
    state = result.state;

    const window2 = CLEAN_MANTRA; // re-hears the 3-word overlap, then the rest
    result = applyTranscriptWindow(state, window2);
    state = result.state;

    // Total genuine holy-name words spoken across both windows is exactly
    // 32 (two full mantras) - if the overlap were double-counted this
    // would read higher and could even report a false extra mantra.
    expect(state.totalTokens).toBe(32);
    expect(state.mantrasReported).toBe(2);
  });

  it("accumulates across several DISTINCT (non-overlapping) windows that each fall short of one mantra alone", () => {
    // Split CLEAN_MANTRA's 16 tokens into 4 windows at points where the
    // token on either side of the cut differs (never two windows meeting
    // on a repeated word) - so nothing here exercises the overlap-strip
    // path itself; see the dedicated overlap test above for that. This
    // isolates "does the running total accumulate across many small
    // windows", independent of dedup.
    let state = createMantraCounterState();
    let totalNewMantras = 0;
    const windows = [
      "hare krishna hare", // 3 tokens
      "krishna krishna krishna hare hare hare", // 6 tokens
      "rama hare rama rama rama", // 5 tokens
      "hare hare", // 2 tokens (total 16)
    ];
    for (const window of windows) {
      const result = applyTranscriptWindow(state, window);
      state = result.state;
      totalNewMantras += result.newMantras;
    }
    expect(state.totalTokens).toBe(16);
    expect(totalNewMantras).toBe(1);
  });

  it("a silent/empty window contributes nothing and reports 0 new mantras", () => {
    const state = createMantraCounterState();
    const result = applyTranscriptWindow(state, "");
    expect(result.newMantras).toBe(0);
    expect(result.state.totalTokens).toBe(0);
  });
});
