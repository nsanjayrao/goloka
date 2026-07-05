import { describe, expect, it } from "vitest";

import { safeDecodeURIComponent } from "./utils";

describe("safeDecodeURIComponent", () => {
  it("decodes a normal percent-encoded segment", () => {
    expect(safeDecodeURIComponent("Kirtans%20%26%20Bhajans")).toBe("Kirtans & Bhajans");
  });
  it("returns null for malformed percent-encoding instead of throwing", () => {
    expect(safeDecodeURIComponent("%E0%A4%")).toBeNull();
  });
  it("passes plain text through unchanged", () => {
    expect(safeDecodeURIComponent("General")).toBe("General");
  });
});
