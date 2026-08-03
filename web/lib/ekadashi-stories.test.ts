import { describe, expect, it } from "vitest";

import {
  allStories,
  ekadashisWithoutStory,
  storyForName,
  storyForSlug,
  titleKeywordsFor,
  desireTreeUrl,
  WITHDRAWN,
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
  it("has a story for every ekadashi EXCEPT the withdrawn ones", () => {
    // Two guards in one. Adding a date to vaishnava-calendar.ts without
    // writing its mahatmya fails here rather than shipping a "Read the
    // story" link that 404s - AND quietly forgetting to rewrite a withdrawn
    // story fails here too, because the sets must match exactly.
    expect(ekadashisWithoutStory().sort()).toEqual(WITHDRAWN.map((w) => w.name).sort());
  });

  it("covers 24 distinct ekadashis, minus those pending a rewrite", () => {
    expect(EKADASHIS.length).toBe(36);
    expect(distinctEkadashis().length).toBe(24);
    expect(allStories().length + WITHDRAWN.length).toBe(24);
  });

  it("publishes no story for a withdrawn ekadashi", () => {
    // The whole point of withdrawing them: the invented text must not be
    // reachable. /calendar falls back to /topic/ekadashi for these.
    for (const { slug, name } of WITHDRAWN) {
      expect(storyForSlug(slug), `${slug} is still published`).toBeNull();
      expect(storyForName(name), `${name} is still published`).toBeNull();
    }
  });

  it("records what each withdrawn source ACTUALLY says", () => {
    // So the rewrite starts from a fact rather than from the same guess.
    for (const w of WITHDRAWN) {
      expect(w.sourceIs.length, w.slug).toBeGreaterThan(40);
    }
  });

  it("has no story for an ekadashi the calendar does not know", () => {
    const known = new Set(distinctEkadashis().map((e) => e.slug));
    for (const story of allStories()) expect(known.has(story.slug)).toBe(true);
  });

  it("resolves by calendar NAME, which is what /calendar holds", () => {
    const withdrawn = new Set(WITHDRAWN.map((w) => w.name));
    for (const entry of EKADASHIS) {
      const story = storyForName(entry.name);
      if (withdrawn.has(entry.name)) {
        // Deliberately unresolvable while its invented text is being
        // rewritten - /calendar falls back to /topic/ekadashi.
        expect(story, `${entry.name} is withdrawn`).toBeNull();
        continue;
      }
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
  it("every story declares its occasion, purana and source", () => {
    for (const story of allStories()) {
      expect(story.purana.length, story.slug).toBeGreaterThan(3);
      expect(story.occasion, story.slug).toMatch(/pakṣa$/);
      expect(["narrative", "glories"], story.slug).toContain(story.kind);
    }
  });

  it("holds no retelling of scripture - only facts about the day", () => {
    // The governing rule (see the file header): Goloka does not tell the
    // mahatmya. If a prose field ever reappears on a story, this fails.
    const PROSE = ["summary", "panels", "caption", "fullStory", "text", "body"];
    for (const story of allStories()) {
      for (const key of Object.keys(story)) {
        expect(PROSE, `${story.slug} gained a prose field "${key}"`).not.toContain(key);
      }
    }
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
    for (const keyword of shravana) {
      expect(keyword, "unqualified Putrada would collide").not.toMatch(/^Putrada /);
    }
    expect(shravana.some((k) => k.startsWith("Shravana Putrada"))).toBe(true);
    // The Pauṣa story is withdrawn pending a rewrite; this still has to hold
    // the day it returns, so the comparison runs whenever it is published
    // rather than being deleted and forgotten.
    const pausha = storyForSlug("putrada");
    if (pausha) {
      expect(shravana.filter((k) => titleKeywordsFor(pausha).includes(k))).toEqual([]);
    }
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

describe("desireTreeUrl", () => {
  it("prefers the verified deep link", () => {
    expect(desireTreeUrl(storyForSlug("kamika")!)).toBe(
      "https://iskcondesiretree.com/page/kamika-ekadasi"
    );
  });

  it("falls back to search when no page was found", () => {
    const orphan = { ...storyForSlug("kamika")!, sourceSlug: undefined };
    expect(desireTreeUrl(orphan)).toBe("https://iskcondesiretree.com/?s=Kamika%20Ekadasi");
  });

  it("produces an ascii url for every story", () => {
    for (const story of allStories()) {
      const url = desireTreeUrl(story);
      expect(url.startsWith("https://iskcondesiretree.com/")).toBe(true);
      expect(url, story.slug).toMatch(/^[\x20-\x7e]+$/);
    }
  });
});
