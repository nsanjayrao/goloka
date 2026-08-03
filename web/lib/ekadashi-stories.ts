import { distinctEkadashis, ekadashiSlug } from "@/lib/vaishnava-calendar";

// The twenty-four ekādaśīs, as FACTS ABOUT EACH DAY - the name, the lunar
// occasion, the Purāṇa its glories are recorded in, and where that text is
// published. Nothing here tells a māhātmya, and nothing here should.
//
// WE DO NOT TELL THE STORY (owner decision, 2026-08-03 - the governing rule).
// A māhātmya comes down through paramparā, master to student. Goloka is not
// in that chain, so it neither reproduces the text nor retells it: the
// ekādaśī page carries the date, the Purāṇa, a prominent link to the text
// where it is published whole, and the classes on that day from the
// catalogue. A devotee reads the scripture from the people who carry it.
//
// This file used to hold panel captions and one-line summaries - our prose
// about scripture - and before that a 13,000-word paraphrase with a coverage
// test enforcing completeness. Both are gone. The lesson worth keeping:
// COMPLETENESS DOES NOT JUSTIFY AUTHORSHIP HERE. A faithful retelling is
// still a retelling, and the fix for "our page is thin" was never to write
// more of our own words - it was to send people to the real thing.
//
// /calendar still needed this: a devotee who tapped "Pāśāṅkuśā Ekādaśī" used
// to land on /topic/ekadashi, the same undifferentiated pile of 278 videos
// every other ekādaśī also pointed at. Now each name leads to its own day.
//
// ONE STORY PER NAME. vaishnava-calendar.ts holds 36 dated entries but only
// 24 distinct ekādaśīs; Kāmikā falls in both 2026 and 2027 and is one story,
// keyed by ekadashiSlug(name). Every year after 2027 reuses these unchanged.
//
// WHAT WENT WRONG HERE, 2026-08-01, so it is not repeated. The first version
// of this file gave all 24 ekādaśīs a NARRATIVE, because the comic-panel
// format needed one. But many māhātmyas are not narratives at all - they are
// glorification: what the fast erases, what an offering outweighs, and no
// plot whatever. Where the Purāṇa gave only that, a story got invented to
// fill the panels, and shipped as scripture. Kāmikā gained a warrior who
// killed a brāhmaṇa and was refused the funeral fire; Aparā gained a murdered
// king haunting a pipal tree. Neither exists in the text.
//
// Two things changed as a result. `kind` now records what the source actually
// is, so a `glories` day renders the māhātmya's own comparisons instead of a
// fabricated plot - and those turned out to be the BETTER panels: one Tulasī
// leaf outweighing a treasury, thirty generations delivered by one fast, an
// axe taken to a full-grown forest of sinful deeds. And WITHDRAWN below is
// where a fabrication goes the moment it is found - unpublished, not left
// standing while it is fixed. It is empty again; all four were rewritten
// from source the same day.
//
// AND A CORRECTION TO THE CORRECTION. The audit that found this compared
// ASCII proper nouns exactly, and so reported Putradā as fabricated too -
// it searched for "Suketuman"/"Saibya" against a source that spells them
// "Suketumaan"/"Shaibyaa". That story was right all along and has been
// restored. Transliteration varies wildly across these texts; fold doubled
// vowels and sh/s, th/t, v/w before concluding a name is absent.

export type EkadashiStory = {
  slug: string;
  /** IAST name, identical to the vaishnava-calendar.ts entry. */
  name: string;
  /** Lunar occasion, e.g. "Śrāvaṇa, kṛṣṇa-pakṣa". */
  occasion: string;
  /** The Purāṇa this māhātmya is recorded in.
   *
   * CHECKED AGAINST EACH SOURCE'S OWN CLOSING LINE, 2026-08-01, and 6 of the
   * 19 that state one were wrong: Mokṣadā is Brahmāṇḍa (not Brahma-vaivarta),
   * Saphalā and Bhaimī are Bhaviṣya-uttara (not Brahma-vaivarta and Padma),
   * and Śayanī, Utpannā and Ṣaṭ-tilā are Bhaviṣya-UTTARA, not Bhaviṣya. A
   * third of them wrong is the measure of how little a confident recollection
   * is worth here.
   *
   * FIVE ARE STILL UNVERIFIED because their source page states no attribution
   * at all: annada, pasankusa, papamocani, varuthini, pandava-nirjala. Those
   * five are my own best knowledge and, on the above hit rate, roughly one or
   * two of them are probably wrong. Check them against a printed Purāṇa
   * before treating them as settled. */
  purana: string;
  /** WHAT THE SOURCE ACTUALLY IS - added 2026-08-01 after an audit found
   * five stories here that scripture does not tell.
   *
   * Not every ekādaśī māhātmya is a narrative. Many are `glories`: the Lord
   * tells Yudhiṣṭhira what the fast erases and what an offering is worth,
   * with no plot and no characters at all. The first version of this file
   * assumed every ekādaśī had a story, because the panel format demanded
   * one - so where the Purāṇa gave only glorification, a narrative got
   * INVENTED to fill the panels. Kāmikā acquired a warrior who killed a
   * brāhmaṇa; Aparā a murdered king haunting a pipal tree. Neither is in the
   * text.
   *
   * This field exists so that can never be silent again: a story marked
   * `glories` must render the māhātmya's own comparisons, not a plot. */
  kind: "narrative" | "glories";
  /** ISKCON Desire Tree's page slug, verified to resolve. Their deep links
   * DO exist (/page/kamika-ekadasi) - an earlier probe tested /page/ekadashi,
   * got a 404, and wrongly concluded the whole pattern was unusable. Absent
   * where no page was found, and the link falls back to their search. */
  sourceSlug?: string;
  /** Other names this ekādaśī is titled under, ASCII as devotees actually
   * type them. Two separate problems, both measured against the catalogue
   * on 2026-08-01 rather than guessed:
   *
   *   1. TRANSLITERATION. Stripping diacritics from IAST gives the academic
   *      spelling, not the popular one - "Pāpamocanī" becomes "Papamocani"
   *      while every video in the catalogue says "Papamochani". Same for
   *      Pārśva/Parshva, Ṣaṭ-tilā/Shattila, Pāśāṅkuśā/Papankusha.
   *   2. GENUINE SECOND NAMES. Several ekādaśīs have two traditional names
   *      (Bhaimī is Jayā; Utthāna is Prabodhinī; Pārśva is Parivartinī),
   *      and a devotee's video may use either.
   *
   * Before these, three stories matched nothing at all. */
  aliases?: string[];
};

const STORIES: EkadashiStory[] = [
  {
    slug: "sayani",
    name: "Śayanī Ekādaśī",
    occasion: "Āṣāḍha, śukla-pakṣa",
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "sayana-ekadasi",
    aliases: ["Devshayani", "Devasayani", "Shayani", "Hari Shayani", "Padma"],
  },
  {
    slug: "kamika",
    name: "Kāmikā Ekādaśī",
    occasion: "Śrāvaṇa, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "glories",
    sourceSlug: "kamika-ekadasi",
  },
  {
    slug: "pavitraropana",
    name: "Pavitrāropaṇā Ekādaśī",
    occasion: "Śrāvaṇa, śukla-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    kind: "narrative",
    sourceSlug: "pavitropana-ekadasi",
    // "Shravana Putrada" is QUALIFIED on purpose. This ekādaśī is widely
    // called simply "Putradā", which is also the Pauṣa story's name - the
    // bare word would hand each of them the other's classes. The month
    // disambiguates; an empty shelf is better than a confidently wrong one.
    aliases: ["Pavitropana", "Pavitra", "Pavitraropana", "Shravana Putrada", "Sravana Putrada"],
  },
  {
    slug: "annada",
    name: "Annadā Ekādaśī",
    occasion: "Bhādrapada, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "annada-ekadasi",
    aliases: ["Aja"],
  },
  {
    slug: "parsva",
    name: "Pārśva Ekādaśī",
    occasion: "Bhādrapada, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "parsva-ekadasi",
    aliases: ["Parshva", "Parivartini", "Vamana"],
  },
  {
    slug: "indira",
    name: "Indirā Ekādaśī",
    occasion: "Āśvina, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "indira-ekadasi",
  },
  {
    slug: "pasankusa",
    name: "Pāśāṅkuśā Ekādaśī",
    occasion: "Āśvina, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "glories",
    sourceSlug: "pasankusa-ekadasi",
    aliases: ["Papankusha", "Pashankusha", "Pasankusha"],
  },
  {
    slug: "rama",
    name: "Rāmā Ekādaśī",
    occasion: "Kārtika, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "rama-ekadasi",
  },
  {
    slug: "utthana",
    name: "Utthāna Ekādaśī",
    occasion: "Kārtika, śukla-pakṣa",
    purana: "Skanda Purāṇa",
    kind: "narrative",
    sourceSlug: "utthana-ekadasi",
    aliases: ["Utthan", "Prabodhini", "Devutthana", "Haribodhini", "Dev Uthani"],
  },
  {
    slug: "utpanna",
    name: "Utpannā Ekādaśī",
    occasion: "Mārgaśīrṣa, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "utpanna-ekadasi",
    aliases: ["Utpatti"],
  },
  {
    slug: "moksada",
    name: "Mokṣadā Ekādaśī",
    occasion: "Mārgaśīrṣa, śukla-pakṣa",
    purana: "Brahmāṇḍa Purāṇa",
    kind: "narrative",
    sourceSlug: "mokshada-ekadasi",
    aliases: ["Mokshada"],
  },
  {
    slug: "saphala",
    name: "Saphalā Ekādaśī",
    occasion: "Pauṣa, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "saphala-ekadasi",
    aliases: ["Safala"],
  },
  {
    slug: "putrada",
    name: "Putradā Ekādaśī",
    occasion: "Pauṣa, śukla-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    kind: "narrative",
    sourceSlug: "putrada-ekadasi",
    aliases: ["Pausha Putrada", "Pausa Putrada"],
  },
  {
    slug: "sat-tila",
    name: "Ṣaṭ-tilā Ekādaśī",
    occasion: "Māgha, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "sattila-ekadasi",
    aliases: ["Shattila", "Sattila", "Shat-tila", "Sat Tila"],
  },
  {
    slug: "bhaimi",
    name: "Bhaimī Ekādaśī",
    occasion: "Māgha, śukla-pakṣa",
    purana: "Bhaviṣya-uttara Purāṇa",
    kind: "narrative",
    sourceSlug: "bhaimi-ekadasi",
    aliases: ["Jaya", "Bhishma", "Bhaimi"],
  },
  {
    slug: "vijaya",
    name: "Vijayā Ekādaśī",
    occasion: "Phālguna, kṛṣṇa-pakṣa",
    purana: "Skanda Purāṇa",
    kind: "narrative",
    sourceSlug: "vijaya-ekadasi",
  },
  {
    slug: "amalaki",
    name: "Āmalakī Ekādaśī",
    occasion: "Phālguna, śukla-pakṣa",
    purana: "Brahmāṇḍa Purāṇa",
    kind: "narrative",
    sourceSlug: "amalaki-ekadasi",
    aliases: ["Amalaka", "Amla"],
  },
  {
    slug: "papamocani",
    name: "Pāpamocanī Ekādaśī",
    occasion: "Caitra, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    kind: "narrative",
    sourceSlug: "papamocani-ekadasi",
    aliases: ["Papamochani"],
  },
  {
    slug: "kamada",
    name: "Kāmadā Ekādaśī",
    occasion: "Caitra, śukla-pakṣa",
    purana: "Varāha Purāṇa",
    kind: "narrative",
    sourceSlug: "kamada-ekadasi",
  },
  {
    slug: "varuthini",
    name: "Varūthinī Ekādaśī",
    occasion: "Vaiśākha, kṛṣṇa-pakṣa",
    purana: "Bhaviṣya Purāṇa",
    kind: "glories",
    sourceSlug: "varuthini-ekadasi",
  },
  {
    slug: "mohini",
    name: "Mohinī Ekādaśī",
    occasion: "Vaiśākha, śukla-pakṣa",
    purana: "Kūrma Purāṇa",
    kind: "narrative",
    sourceSlug: "mohini-ekadasi",
    aliases: ["Mohini"],
  },
  {
    slug: "apara",
    name: "Aparā Ekādaśī",
    occasion: "Jyeṣṭha, kṛṣṇa-pakṣa",
    purana: "Brahmāṇḍa Purāṇa",
    kind: "glories",
    sourceSlug: "apara-ekadasi",
    aliases: ["Achala", "Achhala"],
  },
  {
    slug: "pandava-nirjala",
    name: "Pāṇḍava Nirjalā Ekādaśī",
    occasion: "Jyeṣṭha, śukla-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "pandava-nirjala-ekadasi",
    aliases: ["Nirjala", "Bhima", "Bhimseni", "Pandava"],
  },
  {
    slug: "yogini",
    name: "Yoginī Ekādaśī",
    occasion: "Āṣāḍha, kṛṣṇa-pakṣa",
    purana: "Brahma-vaivarta Purāṇa",
    kind: "narrative",
    sourceSlug: "yogini-ekadasi",
  },
];

/** Ekādaśīs whose first written story was INVENTED and has been pulled from
 * the site pending a rewrite from source (see the file header). These render
 * no page; /calendar and the home strip fall back to /topic/ekadashi, the
 * behaviour storyForName()'s null branch was already built for.
 *
 * Each entry records what the source actually says, so the rewrite starts
 * from a fact rather than from the same guess twice. Empty this array by
 * rewriting them, never by deleting the check. */
export const WITHDRAWN: { slug: string; name: string; sourceIs: string }[] = [
  // Empty as of 2026-08-01: all four withdrawn stories have been rewritten
  // from source, and Putradā - which the first audit flagged wrongly - has
  // been restored. Kept, with its tests, because the next fabrication
  // should land here rather than stay on the site.
];

const BY_SLUG = new Map(STORIES.map((story) => [story.slug, story]));

/** The story for a slug, or null - /ekadashi/[slug] 404s on null rather than
 * rendering a page with a name and no māhātmya. */
export function storyForSlug(slug: string): EkadashiStory | null {
  return BY_SLUG.get(slug) ?? null;
}

/** The story for a registry entry's NAME (what /calendar and vaishnava-today
 * hold). Null while an ekādaśī is in the calendar but not yet written up. */
export function storyForName(name: string): EkadashiStory | null {
  return storyForSlug(ekadashiSlug(name));
}

/** Every story, for generateStaticParams and the index. */
export function allStories(): EkadashiStory[] {
  return STORIES;
}



/** Title keywords for the "classes on this ekādaśī" shelf.
 *
 * DELIBERATELY the two-word phrase ("Kamika Ekadashi"), never the bare name.
 * data.ts's own comment warns that titleKeywords is substring matching and
 * false-positives ("radha" inside "aradhana"), and these names are worse
 * than most: bare "Vijaya" matches every video from Vijayawada, bare "Rama"
 * matches the entire Rāmāyaṇa, bare "Putrada" is fine but "Jaya" is not.
 * Pairing the name with the word that must follow it removes all of that.
 *
 * Both common ASCII spellings are included because devotees title videos
 * both ways; the diacritic form is not, since ILIKE will not fold "Ekādaśī"
 * onto "Ekadashi" anyway. The cost is recall - a class titled only
 * "Śrī Kāmikā-vrata" will be missed. That is the right trade for a shelf
 * sitting under a sacred story: an empty shelf is honest, a wrong video
 * under the wrong ekādaśī is not. */
export function titleKeywordsFor(story: EkadashiStory): string[] {
  const plain = story.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*Ekadasi\s*$/i, "")
    .trim();
  // Deduped: an alias may repeat the stripped name (Bhaimī lists "Bhaimi"),
  // and a duplicate ILIKE in the OR would cost a scan for nothing.
  const stems = [...new Set([plain, ...(story.aliases ?? [])])];
  return stems.flatMap((stem) => [`${stem} Ekadashi`, `${stem} Ekadasi`]);
}

/** ISKCON Desire Tree's page for this ekādaśī - their own telling of the
 * same māhātmya, credited and linked rather than copied.
 *
 * Prefers the DEEP link when the story records a verified `sourceSlug`. An
 * earlier version used search urls for all 24, on the strength of a probe
 * that requested /page/ekadashi, got a 404, and concluded the pattern did
 * not exist. It does: /page/kamika-ekadasi resolves, as do most others. The
 * search url survives as the fallback for the handful with no page found. */
export function desireTreeUrl(story: EkadashiStory): string {
  if (story.sourceSlug) return `https://iskcondesiretree.com/page/${story.sourceSlug}`;
  const plain = story.name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `https://iskcondesiretree.com/?s=${encodeURIComponent(plain)}`;
}

/** Ekādaśīs in the calendar with no story page. Today this is exactly the
 * WITHDRAWN set; a test pins that, so adding a date to vaishnava-calendar.ts
 * without a māhātmya fails the suite rather than shipping a dead link - and
 * so does quietly abandoning a withdrawn rewrite. */
export function ekadashisWithoutStory(): string[] {
  return distinctEkadashis()
    .filter(({ slug }) => !BY_SLUG.has(slug))
    .map(({ name }) => name);
}
