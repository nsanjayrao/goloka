import { describe, expect, it } from "vitest";

import { parseSankalpaSnapshot, SANKALPA_CHOICES } from "./sankalpa";

describe("parseSankalpaSnapshot", () => {
  it("reads a real vow", () => {
    expect(parseSankalpaSnapshot("16")).toBe(16);
    expect(parseSankalpaSnapshot("4")).toBe(4);
    expect(parseSankalpaSnapshot("1")).toBe(1);
    expect(parseSankalpaSnapshot("108")).toBe(108);
  });

  it("no stored value is no vow", () => {
    expect(parseSankalpaSnapshot("")).toBeNull();
  });

  it("anything a human couldn't have vowed is no vow, never an error", () => {
    expect(parseSankalpaSnapshot("0")).toBeNull();
    expect(parseSankalpaSnapshot("-4")).toBeNull();
    expect(parseSankalpaSnapshot("109")).toBeNull();
    expect(parseSankalpaSnapshot("3.5")).toBeNull();
    expect(parseSankalpaSnapshot("abc")).toBeNull();
    expect(parseSankalpaSnapshot("16 rounds")).toBeNull();
  });

  it("every offered choice round-trips", () => {
    for (const n of SANKALPA_CHOICES) {
      expect(parseSankalpaSnapshot(String(n))).toBe(n);
    }
  });
});
