import { describe, expect, it } from "vitest";

import { toPrefixTsQuery } from "./data";
import { expandQueryWord, foldDiacritics, SYNONYM_GROUPS } from "./search-expansion";

const DEVANAGARI = /[ऀ-ॿ]/;

/** Finds the registry group containing `form`, so tests never have to retype
 * a Devanagari/IAST string by hand (a single wrong combining character would
 * silently make an `expect` pass or fail for the wrong reason). */
function groupContaining(form: string): string[] {
  const group = SYNONYM_GROUPS.find((candidate) => candidate.includes(form));
  if (!group) throw new Error(`test fixture problem: no registry group contains "${form}"`);
  return group;
}

/** The IAST-with-diacritics spelling inside a group - neither plain ASCII
 * nor Devanagari. */
function findIastForm(group: string[]): string {
  const form = group.find((candidate) => !/^[a-z ]+$/i.test(candidate) && !DEVANAGARI.test(candidate));
  if (!form) throw new Error("test fixture problem: group has no IAST-diacritic form");
  return form;
}

function findDevanagariForm(group: string[]): string {
  const form = group.find((candidate) => DEVANAGARI.test(candidate));
  if (!form) throw new Error("test fixture problem: group has no Devanagari form");
  return form;
}

describe("foldDiacritics", () => {
  it("passes a plain ASCII word through unchanged (nothing to fold)", () => {
    expect(foldDiacritics("katha")).toEqual(["katha"]);
  });

  it("folds vowel macrons (a-macron, i-macron, u-macron) to plain a/i/u", () => {
    // "gītā" is "gītā" written with unicode escapes, so the exact
    // code points are unambiguous in this file regardless of font/editor.
    expect(foldDiacritics("gītā")).toEqual(["gita"]);
  });

  it("folds vocalic r to BOTH 'r' and 'ri', crossed with sh/s for the sibilant", () => {
    // "kṛṣṇa" is "kṛṣṇa" - the single IAST spelling behind both
    // the "Krsna" and "Krishna" spellings devotees actually type.
    const variants = foldDiacritics("kṛṣṇa");
    expect(variants).toEqual(["krshna", "krsna", "krishna", "krisna"]);
    // The two spellings devotees actually use are both in there...
    expect(variants).toContain("krishna");
    expect(variants).toContain("krsna");
  });

  it("folds retroflex d/t, visarga, and the two nasal marks to plain Latin", () => {
    expect(foldDiacritics("ḍṭa")).toEqual(["dta"]); // ḍ -> d, ṭ -> t
    expect(foldDiacritics("haḥ")).toEqual(["hah"]); // ḥ (visarga) -> h
    expect(foldDiacritics("gaṅgā")).toEqual(["ganga"]); // ṅ -> n, ā -> a
  });

  it("a word with no diacritics never grows past a single variant", () => {
    expect(foldDiacritics("prabhupada")).toEqual(["prabhupada"]);
  });

  it("caps combinatorial growth for a pathological wall of ambiguous letters", () => {
    // Each "ṛṣ" pair alone yields 4 variants (2 x 2); six pairs
    // back to back would be 4^6 = 4096 without the cap.
    const pathological = "ṛṣ".repeat(6);
    expect(foldDiacritics(pathological).length).toBeLessThanOrEqual(16);
  });
});

describe("expandQueryWord: synonym registry, bidirectional", () => {
  it("a plain Latin spelling finds the Devanagari form of the same word", () => {
    const group = groupContaining("ekadashi");
    const devanagari = findDevanagariForm(group);
    expect(expandQueryWord("ekadashi").has(devanagari)).toBe(true);
  });

  it("the Devanagari form finds every Latin spelling back (the reverse direction)", () => {
    const group = groupContaining("ekadashi");
    const devanagari = findDevanagariForm(group);
    const variants = expandQueryWord(devanagari);
    expect(variants.has("ekadashi")).toBe(true);
    expect(variants.has("ekadasi")).toBe(true);
  });

  it("an IAST-diacritic spelling folds AND resolves to the whole group (Latin + Devanagari)", () => {
    const group = groupContaining("ekadashi");
    const iast = findIastForm(group);
    const variants = expandQueryWord(iast);
    for (const form of group) expect(variants.has(form)).toBe(true);
  });

  it("krishna resolves to its full registry group (krsna, kṛṣṇa, कृष्ण)", () => {
    const group = groupContaining("krishna");
    const variants = expandQueryWord("krishna");
    for (const form of group) expect(variants.has(form)).toBe(true);
  });

  it("a word with no registry entry and no diacritics expands to only itself", () => {
    expect(expandQueryWord("lecture")).toEqual(new Set(["lecture"]));
  });

  it("every registry group is internally consistent: every member finds every other member", () => {
    for (const group of SYNONYM_GROUPS) {
      for (const form of group) {
        const variants = expandQueryWord(form);
        for (const sibling of group) {
          expect(variants.has(sibling)).toBe(true);
        }
      }
    }
  });
});

describe("toPrefixTsQuery: expansion wired into the search pipeline (lib/data.ts)", () => {
  it("preserves existing behavior for a word with no expansion", () => {
    expect(toPrefixTsQuery("lecture")).toBe("lecture:*");
  });

  it("preserves existing behavior for multiple unexpanded words (' & ' join, unchanged)", () => {
    expect(toPrefixTsQuery("lecture recording")).toBe("lecture:* & recording:*");
  });

  it("expands a single word into a parenthesized '|' group in registry order", () => {
    // "krishna" is listed first in its own group, and has no diacritics to
    // fold, so expandQueryWord's output order exactly matches the registry
    // array - this can be asserted as an exact string, not just a substring.
    const group = groupContaining("krishna");
    expect(toPrefixTsQuery("krishna")).toBe(`(${group.map((form) => `${form}:*`).join(" | ")})`);
  });

  it("joins two expanded words with ' & ', each in its own parenthesized group", () => {
    const ekadashiGroup = groupContaining("ekadashi");
    const kathaGroup = groupContaining("katha");
    const expected =
      `(${ekadashiGroup.map((f) => `${f}:*`).join(" | ")})` +
      " & " +
      `(${kathaGroup.map((f) => `${f}:*`).join(" | ")})`;
    expect(toPrefixTsQuery("ekadashi katha")).toBe(expected);
  });

  it("a query typed with IAST diacritics still reaches the Devanagari-titled videos", () => {
    const group = groupContaining("ekadashi");
    const iast = findIastForm(group);
    const devanagari = findDevanagariForm(group);
    const query = toPrefixTsQuery(iast);
    expect(query).toContain("ekadashi:*");
    expect(query).toContain("ekadasi:*");
    expect(query).toContain(`${devanagari}:*`);
  });

  it("strips reserved tsquery characters from the raw word before expansion runs", () => {
    // "krishna:*" typed as literal input (e.g. pasted) must be treated as
    // the word "krishna", not corrupted tsquery syntax - same safety the
    // pre-expansion implementation had, now proven to survive expansion too.
    expect(toPrefixTsQuery("krishna:*")).toBe(toPrefixTsQuery("krishna"));
    expect(toPrefixTsQuery("krishna&|!()")).toBe(toPrefixTsQuery("krishna"));
  });

  it("returns empty string for input that is only reserved characters", () => {
    expect(toPrefixTsQuery("&|!()")).toBe("");
  });

  it("produces well-formed tsquery syntax for every registry group, not just the examples above", () => {
    // A single search term is `word:*`; a group of alternatives is
    // `(word:* | word:* | ...)`; words are joined with ` & `. This checks
    // the FULL output matches that grammar for every group in the registry
    // (not just the two spot-checked above), which is what proves the
    // reserved-character stripping in toPrefixTsQuery survives expansion
    // for the whole vocabulary, not only the examples this file happens to
    // name explicitly.
    const term = "[^\\s&|!():*]+:\\*"; // one bare term, never containing a reserved char
    const group = `(?:${term}|\\(${term}(?: \\| ${term})*\\))`; // bare term OR a parenthesized "|" group
    const wholeQuery = new RegExp(`^${group}(?: & ${group})*$`, "u");

    for (const synonymGroup of SYNONYM_GROUPS) {
      const query = toPrefixTsQuery(synonymGroup[0]);
      expect(query).toMatch(wholeQuery);
    }
  });
});
