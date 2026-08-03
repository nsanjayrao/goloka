import { describe, expect, it } from "vitest";

import { SPEAKER_HANDLES, speakerName } from "./speakers";

describe("speakerName", () => {
  it("strips the trailing spaces four channel titles actually carry", () => {
    expect(speakerName("Chaitanya Charan Official ")).toBe("Chaitanya Charan");
    expect(speakerName("Indradyumna Swami Official ")).toBe("Indradyumna Swami");
    expect(speakerName("Chaitanya Krishna Dasa ")).toBe("Chaitanya Krishna Dasa");
  });

  it("strips channel branding suffixes", () => {
    expect(speakerName("Niranjana Swami Official")).toBe("Niranjana Swami");
    expect(speakerName("Giriraj Swami Official")).toBe("Giriraj Swami");
    expect(speakerName("Amarendra Dāsa Official")).toBe("Amarendra Dāsa");
    expect(speakerName("Devamrita Swami Media")).toBe("Devamrita Swami");
    expect(speakerName("Nitaisevini Mataji (Official)")).toBe("Nitaisevini Mataji");
  });

  it("leaves a clean name exactly as it is", () => {
    for (const name of [
      "Radhanath Swami",
      "Gaur Gopal Das",
      "HH Bhakti Charu Swami",
      "Vaisesika Dasa",
      "Kadamba Kanana Swami",
      "Jayapataka Swami",
    ]) {
      expect(speakerName(name)).toBe(name);
    }
  });

  it("never touches a name that merely CONTAINS a stripped word", () => {
    // The suffixes only come off the END. A teacher whose name happened to
    // include one of these words mid-string must survive untouched.
    expect(speakerName("Official Swami Media Das")).toBe("Official Swami Media Das");
    expect(speakerName("Media Swami")).toBe("Media Swami");
  });

  it("leaves the four cases marked for the owner's editorial call alone", () => {
    // See the note above speakerName: these need a curated display name, not
    // a widened regex. If someone widens it, this fails and asks them why.
    expect(speakerName("My Ashraya")).toBe("My Ashraya");
    expect(speakerName("H.D.Goswami")).toBe("H.D.Goswami");
    expect(speakerName("भक्ति विकास स्वामी - Bhakti Vikasa Swami  ")).toBe(
      "भक्ति विकास स्वामी - Bhakti Vikasa Swami"
    );
    expect(speakerName("Nitya Mukta Dāsa తిరుపతి ధామ్")).toBe("Nitya Mukta Dāsa తిరుపతి ధామ్");
  });

  it("never returns an empty name", () => {
    // A title that is ONLY a stripped word must not vanish - showing
    // "Official" is bad, showing nothing under a face is worse.
    expect(speakerName("Official").length).toBeGreaterThan(0);
  });
});

describe("SPEAKER_HANDLES", () => {
  it("is the display order for /leaders, and holds no duplicates", () => {
    expect(new Set(SPEAKER_HANDLES).size).toBe(SPEAKER_HANDLES.length);
  });

  it("is all youtube handles", () => {
    for (const handle of SPEAKER_HANDLES) expect(handle).toMatch(/^@[\w.-]+$/);
  });
});
