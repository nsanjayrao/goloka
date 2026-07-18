import { beforeEach, describe, expect, it } from "vitest";

import { getDataSaverServerSnapshot, getDataSaverSnapshot, parseDataSaverSnapshot, setDataSaver } from "./data-saver";

// The Node test environment has no `localStorage` global (that's a browser
// API) - a tiny in-memory stand-in is enough to exercise the real
// get/set logic in data-saver.ts. Mirrors recently-watched.test.ts.
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

describe("setDataSaver / getDataSaverSnapshot", () => {
  beforeEach(() => {
    installFakeLocalStorage();
  });

  it("reports no explicit choice before the visitor ever touches the switch", () => {
    expect(getDataSaverSnapshot()).toBe("");
  });

  it("persists an explicit choice, on or off", () => {
    setDataSaver(true);
    expect(getDataSaverSnapshot()).toBe("1");
    setDataSaver(false);
    expect(getDataSaverSnapshot()).toBe("0");
  });
});

describe("parseDataSaverSnapshot", () => {
  it("reads an explicit choice literally", () => {
    expect(parseDataSaverSnapshot("1")).toBe(true);
    expect(parseDataSaverSnapshot("0")).toBe(false);
  });

  it("falls back to the connection signal (false with no navigator.connection, e.g. this test environment) when there's no explicit choice", () => {
    expect(parseDataSaverSnapshot("")).toBe(false);
  });
});

describe("getDataSaverServerSnapshot", () => {
  it("is 'off', matching a visitor with no explicit choice yet - no hydration mismatch", () => {
    expect(getDataSaverServerSnapshot()).toBe("0");
    expect(parseDataSaverSnapshot(getDataSaverServerSnapshot())).toBe(false);
  });
});
