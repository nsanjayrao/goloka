// Query expansion for search (Discovery upgrade, transliteration tolerance).
//
// The FTS column (`search_tsv`, db/schema.sql) uses Postgres's 'simple'
// text-search config, which does no stemming and no script conversion - it
// just lowercases and tokenizes whatever bytes are there. That means a
// Devanagari query term like "एकादशी:*" already matches a Devanagari title
// with zero schema work. What it can NOT do on its own is connect DIFFERENT
// spellings of the same word: a title stored as "Ekādaśī" (with IAST
// diacritics), one stored as "Ekadashi" (plain Latin), and one stored as
// "एकादशी" (Devanagari) are three unrelated tokens as far as Postgres is
// concerned, even though a devotee typing any one of them means the same
// thing.
//
// This module closes that gap entirely on the query side - no schema change,
// no re-indexing. Given one word the visitor typed, it returns every spelling
// worth also searching for, in two steps:
//
//   1. Diacritic folding: strip/transliterate IAST marks so "ekādaśī" and
//      "ekadashi" become comparable ASCII.
//   2. A curated synonym registry: a fixed list of ISKCON vocabulary groups
//      (Latin spellings + Devanagari) that are equivalent regardless of
//      folding - Devanagari script has no diacritics to strip, so this is
//      the only way to bridge "krishna" -> "कृष्ण".
//
// `toPrefixTsQuery` in lib/data.ts turns the resulting variant set into a
// parenthesized tsquery OR group per word.

// ---------------------------------------------------------------------------
// Step 1: diacritic folding
// ---------------------------------------------------------------------------

// IAST marks a visitor is unlikely to type, mapped to the plain-Latin
// spellings devotees actually use. Several letters are genuinely ambiguous
// in everyday transliteration, so they map to MULTIPLE candidates rather
// than one "correct" answer:
//   - ṛ ("vocalic r", the vowel in "Krishna"/"Krsna") is written either as a
//     bare "r" (Krsna) or phonetically as "ri" (Krishna).
//   - ś and ṣ are both commonly typed "sh" (Krishna, Kartikeya's "sh"), but
//     also show up as a plain "s" (Krsna, Vishnu -> "Visnu"-style drops).
// Every other mark has one unambiguous plain-Latin form.
const DIACRITIC_FOLDS: Record<string, string[]> = {
  ā: ["a"], Ā: ["a"],
  ī: ["i"], Ī: ["i"],
  ū: ["u"], Ū: ["u"],
  ṛ: ["r", "ri"], Ṛ: ["r", "ri"],
  ṝ: ["r", "ri"], Ṝ: ["r", "ri"],
  ḷ: ["l"], Ḷ: ["l"],
  ḹ: ["l"], Ḹ: ["l"],
  ṁ: ["m"], Ṁ: ["m"],
  ṃ: ["m"], Ṃ: ["m"],
  ṅ: ["n"], Ṅ: ["n"],
  ñ: ["n"], Ñ: ["n"],
  ṇ: ["n"], Ṇ: ["n"],
  ś: ["sh", "s"], Ś: ["sh", "s"],
  ṣ: ["sh", "s"], Ṣ: ["sh", "s"],
  ḍ: ["d"], Ḍ: ["d"],
  ṭ: ["t"], Ṭ: ["t"],
  ḥ: ["h"], Ḥ: ["h"],
};

// A word can contain more than one ambiguous letter (e.g. "kṛṣṇa" has both
// ṛ and ṣ), so folding is a cartesian product of each character's
// candidates, not a single substitution pass. Real ISKCON words never have
// enough ambiguous letters to make this expensive, but the cap keeps any
// pathological input (a wall of diacritics) bounded rather than blowing up.
const MAX_FOLD_VARIANTS = 16;

/** Every plain-Latin spelling `word` could fold to, given IAST diacritics.
 * A word with no diacritics returns exactly `[word]` unchanged. Order is
 * deterministic (first-candidate-first), which is what makes the tsquery
 * assembly tests below assert an exact string rather than a set. */
export function foldDiacritics(word: string): string[] {
  const perCharacterCandidates = [...word].map((char) => DIACRITIC_FOLDS[char] ?? [char]);

  let variants = [""];
  for (const candidates of perCharacterCandidates) {
    const next: string[] = [];
    for (const prefix of variants) {
      for (const candidate of candidates) {
        next.push(prefix + candidate);
      }
    }
    // Cap breadth, not depth: every variant still covers the whole word,
    // we just stop growing the number of alternate spellings.
    variants = next.length > MAX_FOLD_VARIANTS ? next.slice(0, MAX_FOLD_VARIANTS) : next;
  }
  return variants;
}

// ---------------------------------------------------------------------------
// Step 2: curated ISKCON vocabulary synonyms
// ---------------------------------------------------------------------------

// Each inner array is one set of interchangeable spellings for the same
// word - common Latin spelling(s), the IAST form (so foldDiacritics'
// output also lands on a listed form), and the Devanagari form(s) seen in
// the catalog. This is deliberately a flat, hand-curated list rather than a
// generated one: transliteration rules alone can't tell "Krsna" and "कृष्ण"
// are the same word, so someone who knows the vocabulary has to say so once.
//
// Coverage note: this registry only covers Devanagari (Hindi/Sanskrit)
// script, since that's what the catalog's non-Latin titles use. Bengali
// script (e.g. পুরী for Puri, common in Bengali-language ISKCON content) is
// NOT covered - see the report for what that would take to add.
//
// Constraint: every entry must be a SINGLE token (no internal spaces).
// toPrefixTsQuery turns each one into a bare tsquery term ("word:*"); a
// multi-word entry like "bhagavad gita" would produce "bhagavad gita:*",
// which is invalid tsquery syntax (a lexeme reference can't contain a raw
// space). A multi-word concept doesn't need its own entry anyway - "gita"
// alone already matches "Bhagavad Gita" titles, since search is a bag-of-
// words match, not a phrase match.
export const SYNONYM_GROUPS: string[][] = [
  ["ekadashi", "ekadasi", "ekādaśī", "एकादशी"],
  ["kirtan", "kirtana", "kīrtana", "कीर्तन"],
  ["bhajan", "bhajana", "भजन"],
  ["katha", "kathā", "कथा"],
  ["pravachan", "pravachana", "pravacana", "प्रवचन"],
  ["gita", "geeta", "gītā", "गीता"],
  ["bhagavatam", "bhagavata", "bhāgavatam", "भागवत", "श्रीमद्भागवतम्"],
  ["krishna", "krsna", "kṛṣṇa", "कृष्ण"],
  ["radha", "rādhā", "राधा"],
  ["radharani", "radharaani", "rādhārāṇī", "राधारानी"],
  ["prabhupada", "prabhupad", "prabhupāda", "प्रभुपाद"],
  ["vrindavan", "vrindavana", "vrndavana", "vṛndāvana", "वृन्दावन"],
  ["mayapur", "mayapura", "māyāpura", "मायापुर"],
  ["damodara", "damodar", "dāmodara", "दामोदर"],
  ["kartik", "kartika", "kārtika", "कार्तिक"],
  ["janmashtami", "janmastami", "janmāṣṭamī", "जन्माष्टमी"],
  ["aarti", "arati", "ārati", "आरती"],
  ["darshan", "darshana", "darśana", "दर्शन"],
  ["prasadam", "prasad", "prasāda", "प्रसाद"],
  ["mantra", "मंत्र"],
  ["japa", "jap", "जप"],
  ["harinam", "harinaam", "harināma", "हरिनाम"],
  ["guru", "गुरु"],
  ["bhakti", "भक्ति"],
  ["seva", "sevā", "सेवा"],
  ["mandir", "mandira", "temple", "मंदिर"],
  ["holi", "holī", "होली"],
  ["diwali", "deepavali", "dīpāvalī", "दिवाली", "दीपावली"],
  ["govardhan", "govardhana", "गोवर्धन"],
  ["tulasi", "tulsi", "तुलसी"],
  ["nrsimha", "narasimha", "nrisimha", "nṛsiṁha", "नृसिंह"],
  ["caitanya", "chaitanya", "चैतन्य"],
  ["nitai", "nityananda", "nityānanda", "निताई", "नित्यानंद"],
  ["gauranga", "gaurāṅga", "गौरांग"],
  ["sankirtan", "sankirtana", "saṅkīrtana", "संकीर्तन"],
  ["vaishnav", "vaishnava", "vaisnava", "वैष्णव"],
  ["swami", "svāmī", "स्वामी"],
  ["maharaj", "maharaja", "mahārāja", "महाराज"],
  ["yoga", "योग"],
  ["dhama", "dhāma", "धाम"],
  ["puja", "pooja", "pūjā", "पूजा"],
  ["arjuna", "अर्जुन"],
  ["yamuna", "yamunā", "यमुना"],
  ["ganga", "gaṅgā", "गंगा"],
  ["bhagavan", "bhagwan", "bhagavān", "भगवान"],
  ["srila", "shrila", "śrīla", "श्रील"],
  ["iskcon", "इस्कॉन"],
  ["vaikuntha", "vaikuntha", "vaikuṇṭha", "वैकुण्ठ"],
  ["goloka", "गोलोक"],
  ["lila", "leela", "līlā", "लीला"],
  ["shastra", "shaastra", "śāstra", "शास्त्र"],
  ["veda", "vedas", "vedā", "वेद"],
  ["ashram", "ashrama", "āśrama", "आश्रम"],
  ["sadhu", "sādhu", "साधु"],
  ["satsang", "satsanga", "सत्संग"],
  ["yajna", "yagya", "yajña", "यज्ञ"],
  ["murti", "moorti", "mūrti", "मूर्ति"],
  ["parikrama", "parikramā", "परिक्रमा"],
  ["acharya", "acharaya", "ācārya", "आचार्य"],
  ["vrata", "vrat", "व्रत"],
  ["nama", "naam", "नाम"],
];

// Reverse lookup: any spelling in a group -> the full group (as a Set for
// fast membership + spread). Built once at module load. Keys are lowercased
// so lookups from folded/lowercased query words still hit - Devanagari has
// no case, so lowercasing it is a no-op.
const SYNONYM_LOOKUP: Map<string, Set<string>> = (() => {
  const lookup = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    const asSet = new Set(group);
    for (const form of group) {
      lookup.set(form.toLowerCase(), asSet);
    }
  }
  return lookup;
})();

// ---------------------------------------------------------------------------
// Step 3: putting it together
// ---------------------------------------------------------------------------

/** Every spelling worth searching for a single query word `word`: the word
 * itself, its diacritic-folded variants, and (if any of those match a
 * curated entry) every other spelling in that entry's synonym group -
 * including crossing scripts, e.g. "krishna" -> also "kṛṣṇa" and "कृष्ण".
 * Always returns at least `{ word }` (never an empty set), and the caller
 * is expected to have already trimmed/validated `word` is non-empty. */
export function expandQueryWord(word: string): Set<string> {
  const foldedVariants = foldDiacritics(word);
  const result = new Set<string>([word, ...foldedVariants]);

  // Look up every spelling collected so far (not just `word` itself) - a
  // query typed in IAST ("ekādaśī") only becomes a lookup hit once it has
  // been folded to "ekadashi"/"ekadasi", which is one of the listed forms.
  for (const candidate of [...result]) {
    const group = SYNONYM_LOOKUP.get(candidate.toLowerCase());
    if (group) {
      for (const form of group) result.add(form);
    }
  }

  return result;
}
