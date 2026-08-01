import { describe, expect, it } from "vitest";

import {
  allStories,
  ekadashisWithoutStory,
  panelArtPath,
  storyForName,
  storyForSlug,
  titleKeywordsFor,
  desireTreeSearchUrl,
} from "./ekadashi-stories";
import { EKADASHIS, distinctEkadashis, ekadashiSlug } from "./vaishnava-calendar";

describe("ekadashiSlug", () => {
  it("strips IAST diacritics, including the dot-below retroflexes", () => {
    expect(ekadashiSlug("Kāmikā Ekādaśī")).toBe("kamika");
    expect(ekadashiSlug("Ṣaṭ-tilā Ekādaśī")).toBe("sat-tila");
    expect(ekadashiSlug("Pāśāṅkuśā Ekādaśī")).toBe("pasankusa");
    expect(ekadashiSlug("Pāṇḍava Nirjalā Ekādaśī")).toBe("pandava-nirjala");
    expect(ekadashiSlug("Āmalakī Ekādaśī")).toBe("amalaki");
  });

  it("produces url-safe slugs for every entry in the calendar", () => {
    for (const entry of EKADASHIS) {
      expect(ekadashiSlug(entry.name)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("gives the two occurrences of one ekadashi the SAME slug", () => {
    // Kāmikā falls in both 2026 and 2027 - one story, not two.
    const kamikas = EKADASHIS.filter((e) => e.name.startsWith("Kāmikā"));
    expect(kamikas.length).toBe(2);
    expect(new Set(kamikas.map((e) => ekadashiSlug(e.name))).size).toBe(1);
  });
});

describe("story coverage", () => {
  it("has a story for EVERY distinct ekadashi in the calendar", () => {
    // The guard that matters: adding a date to vaishnava-calendar.ts without
    // writing its mahatmya fails here rather than shipping a "Read the story"
    // link that 404s.
    expect(ekadashisWithoutStory()).toEqual([]);
  });

  it("covers all 24 distinct ekadashis from 36 dated entries", () => {
    expect(EKADASHIS.length).toBe(36);
    expect(distinctEkadashis().length).toBe(24);
    expect(allStories().length).toBe(24);
  });

  it("has no story for an ekadashi the calendar does not know", () => {
    const known = new Set(distinctEkadashis().map((e) => e.slug));
    for (const story of allStories()) expect(known.has(story.slug)).toBe(true);
  });

  it("resolves by calendar NAME, which is what /calendar holds", () => {
    for (const entry of EKADASHIS) {
      const story = storyForName(entry.name);
      expect(story, `no story for ${entry.name}`).not.toBeNull();
      expect(story!.name).toBe(entry.name);
    }
  });

  it("returns null for an unknown slug rather than throwing", () => {
    expect(storyForSlug("not-an-ekadashi")).toBeNull();
    expect(storyForName("Made Up Ekādaśī")).toBeNull();
  });
});

describe("story shape", () => {
  it("every story has a summary, a purana, an occasion and panels", () => {
    for (const story of allStories()) {
      expect(story.summary.length, story.slug).toBeGreaterThan(20);
      expect(story.purana.length, story.slug).toBeGreaterThan(3);
      expect(story.occasion, story.slug).toMatch(/pakṣa$/);
      expect(story.panels.length, story.slug).toBeGreaterThanOrEqual(4);
    }
  });

  it("every panel has a caption", () => {
    for (const story of allStories()) {
      for (const [i, panel] of story.panels.entries()) {
        expect(panel.caption.length, `${story.slug} panel ${i + 1}`).toBeGreaterThan(40);
      }
    }
  });

  it("derives art paths from position, never from a stored filename", () => {
    expect(panelArtPath("kamika", 0)).toBe("/ekadashi/kamika/panel-1.webp");
    expect(panelArtPath("sat-tila", 3)).toBe("/ekadashi/sat-tila/panel-4.webp");
  });
});

describe("titleKeywordsFor", () => {
  it("pairs every stem with the word Ekadashi, never the bare name", () => {
    // The bare name is the trap data.ts warns about: "Vijaya" alone matches
    // every video from Vijayawada, "Rama" the whole Rāmāyaṇa.
    for (const story of allStories()) {
      for (const keyword of titleKeywordsFor(story)) {
        expect(keyword, story.slug).toMatch(/ Ekadash?i$/);
      }
    }
  });

  it("covers both common ASCII spellings of the word itself", () => {
    const kamika = storyForSlug("kamika")!;
    expect(titleKeywordsFor(kamika)).toEqual(["Kamika Ekadashi", "Kamika Ekadasi"]);
  });

  it("includes aliases, so popular spellings are not missed", () => {
    // "Papamocani" is the diacritic-stripped IAST; every video says
    // "Papamochani". Without the alias this shelf was empty.
    expect(titleKeywordsFor(storyForSlug("papamocani")!)).toContain("Papamochani Ekadashi");
    expect(titleKeywordsFor(storyForSlug("sat-tila")!)).toContain("Shattila Ekadashi");
    expect(titleKeywordsFor(storyForSlug("parsva")!)).toContain("Parivartini Ekadashi");
  });

  it("never lets the two Putrada ekadashis claim each other's classes", () => {
    // Pavitrāropaṇā is widely called "Putradā" - so is the Pauṣa one. The
    // Śrāvaṇa story must only ever use the MONTH-QUALIFIED form, or each
    // shelf fills with the other's videos and neither is wrong-looking.
    const shravana = titleKeywordsFor(storyForSlug("pavitraropana")!);
    const pausha = titleKeywordsFor(storyForSlug("putrada")!);
    for (const keyword of shravana) {
      expect(keyword, "unqualified Putrada would collide").not.toMatch(/^Putrada /);
    }
    expect(shravana.some((k) => k.startsWith("Shravana Putrada"))).toBe(true);
    // And no keyword is shared between the two stories.
    expect(shravana.filter((k) => pausha.includes(k))).toEqual([]);
  });

  it("deduplicates a stem that an alias repeats", () => {
    // Bhaimī lists "Bhaimi" as an alias, which is also its stripped name.
    const keywords = titleKeywordsFor(storyForSlug("bhaimi")!);
    expect(keywords.length).toBe(new Set(keywords).size);
  });

  it("produces no keyword shared by two different stories", () => {
    const owner = new Map<string, string>();
    for (const story of allStories()) {
      for (const keyword of titleKeywordsFor(story)) {
        const previous = owner.get(keyword);
        expect(previous, `${keyword} claimed by ${previous} and ${story.slug}`).toBeUndefined();
        owner.set(keyword, story.slug);
      }
    }
  });
});

describe("desireTreeSearchUrl", () => {
  it("links to a search, not a deep link, with diacritics stripped", () => {
    expect(desireTreeSearchUrl("Kāmikā Ekādaśī")).toBe(
      "https://iskcondesiretree.com/?s=Kamika%20Ekadasi"
    );
  });

  it("produces a usable url for every story", () => {
    for (const story of allStories()) {
      const url = desireTreeSearchUrl(story.name);
      expect(url.startsWith("https://iskcondesiretree.com/?s=")).toBe(true);
      // No raw non-ASCII left in the query.
      expect(url).toMatch(/^[\x20-\x7e]+$/);
    }
  });
});
