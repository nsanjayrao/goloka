import { describe, expect, it } from "vitest";

import bn from "@/messages/bn.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import hi from "@/messages/hi.json";
import ru from "@/messages/ru.json";

// The i18n drift guard: en.json is the source of truth for the site chrome
// (goal #5). Every other locale must carry exactly the same set of keys -
// this test fails loudly the moment someone adds an English string without
// adding its translation everywhere else, instead of that gap surfacing
// silently as an untranslated fallback in production.
const LOCALES: Record<string, unknown> = { hi, bn, ru, es };

// Recursively lists every leaf key path ("pages.about.h1") in a messages
// object, so nesting depth doesn't matter to the comparison.
function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("message catalog completeness", () => {
  const englishKeys = leafKeys(en).sort();

  it("has at least the site-chrome-sized key set", () => {
    // Sanity check on the source of truth itself - catches an accidental
    // near-empty en.json before it's even compared against the others.
    expect(englishKeys.length).toBeGreaterThan(100);
  });

  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale}.json has exactly the same keys as en.json`, () => {
      const localeKeys = leafKeys(messages).sort();
      const missing = englishKeys.filter((key) => !localeKeys.includes(key));
      const extra = localeKeys.filter((key) => !englishKeys.includes(key));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });
  }
});
