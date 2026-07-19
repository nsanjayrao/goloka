import { beforeEach, describe, expect, it } from "vitest";

import {
  getContentLanguageServerSnapshot,
  getContentLanguageSnapshot,
  parseContentLanguageSnapshot,
  setContentLanguage,
} from "./content-language";

// The Node test environment has no `localStorage` global (that's a browser
// API) - a tiny in-memory stand-in is enough to exercise the real
// get/set logic in content-language.ts. Mirrors data-saver.test.ts.
function installFakeLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

describe("setContentLanguage / getContentLanguageSnapshot", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("reports no preference before the visitor ever picks a language", () => {
    expect(getContentLanguageSnapshot()).toBe("");
  });

  it("persists a chosen language", () => {
    setContentLanguage("Hindi");
    expect(getContentLanguageSnapshot()).toBe("Hindi");
  });

  it("clears back to no preference when set to null (the 'All' chip)", () => {
    setContentLanguage("Tamil");
    expect(getContentLanguageSnapshot()).toBe("Tamil");
    setContentLanguage(null);
    expect(getContentLanguageSnapshot()).toBe("");
  });
});

describe("parseContentLanguageSnapshot", () => {
  it("reads a stored language literally", () => {
    expect(parseContentLanguageSnapshot("Russian")).toBe("Russian");
  });

  it("treats the empty string as no preference", () => {
    expect(parseContentLanguageSnapshot("")).toBeNull();
  });
});

describe("getContentLanguageServerSnapshot", () => {
  it("is 'no preference', matching a visitor who hasn't picked yet - no hydration mismatch", () => {
    expect(getContentLanguageServerSnapshot()).toBe("");
    expect(parseContentLanguageSnapshot(getContentLanguageServerSnapshot())).toBeNull();
  });
});
