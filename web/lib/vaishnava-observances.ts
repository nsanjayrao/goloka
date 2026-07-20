// Ācārya observance registry: the appearance and disappearance days of the
// Gauḍīya-Vaiṣṇava paramparā, plus a handful of the Lord's own festival
// days not already covered by topics.ts's festivalWindow shelves (those
// stay a fixed Gregorian approximation on purpose - this registry is the
// precise, tithi-accurate sibling for the days that matter most: a wrong
// disappearance date is an offense to a mahā-bhāgavata, so every entry here
// is hand-researched per occurrence, never computed from a formula. Same
// idiom as vaishnava-calendar.ts's EKADASHIS table - read that file's
// header first.
//
// MOOD: an appearance/festival day is gentle joy ("we honor"); a
// disappearance day is quiet remembrance, not celebration ("we remember") -
// see vaishnava-today.tsx and the /calendar page for how that distinction
// is carried into the UI. The app bows its head; it never throws a party.
//
// CANONICAL LOCATION: Śrī Māyāpur-dhāma, IST (UTC+5:30) - the same
// single-source-of-truth choice as vaishnava-calendar.ts, for the same
// reason (a tithi-based day can fall a calendar day earlier or later for a
// devotee elsewhere in the world; Māyāpur is the deliberate reference
// point, not a claim that it's the only valid date anywhere).
//
// SOURCES (primary: drikpanchang's ISKCON calendar for Kolkata - same IST
// timezone and near-identical longitude to Māyāpur as vaishnava-calendar.ts
// already uses for the ekādaśī table; cross-checked against a temple's own
// published calendar and a second independent list wherever possible -
// every date below has at least the primary source, most have two):
//   - https://www.drikpanchang.com/iskcon/iskcon-event-calendar.html?geoname-id=1275004
//     (2026 full year - PRIMARY for every 2026 date below)
//   - https://www.drikpanchang.com/iskcon/iskcon-event-calendar.html?geoname-id=1275004&year=2027
//     (2027 full year - PRIMARY for every 2027 date below; single-sourced,
//     see the caveat further down)
//   - https://www.iskconbangalore.org/vaishnava-calendar/ (2026-2027,
//     confirms Bhaktivinoda Ṭhākura disappearance, Prabhupāda appearance/
//     disappearance, Bhaktisiddhānta Sarasvatī disappearance, Gaurakiśora
//     dāsa Bābājī disappearance)
//   - https://vrajvrindavan.com/hare-krishna-vaishnav-calendar/ (2026-2027,
//     confirms the Six Gosvāmīs' disappearance days, Nityānanda/Advaita
//     appearance, and the Lord's festival days below)
//   - https://www.drikpanchang.com/iskcon/acharya/jiva-goswami/shrila-jiva-goswami-disappearance.html
//     (Śrīla Jīva Gosvāmī's own dedicated page - see his note below; no
//     occurrence falls in 2026 at all, and 2027 has two)
//
// 2027 dates are drawn from the drikpanchang source only (not independently
// cross-checked the way most 2026 dates were, for lack of time to fetch a
// second full 2027 table) - re-verify against a current Māyāpur pañjikā
// before trusting them into 2028, same caveat vaishnava-calendar.ts already
// carries for its own 2027 ekādaśī dates.
//
// A NOTE ON Śrīla Jīva Gosvāmī: his disappearance falls on Pauṣa-māsa,
// śukla-pakṣa, tṛtīyā - a tithi that happens to land OUTSIDE calendar year
// 2026 entirely (drikpanchang's own dedicated page confirms "no occurrence
// in 2026") and falls TWICE within 2027 (Jan 11 and Dec 30, one from each
// edge of the Pauṣa month that straddles the year boundary). Both 2027
// dates are included below rather than picking one, so the registry stays
// internally consistent with "every real occurrence in range" the way the
// rest of this file works.
//
// DELIBERATELY OMITTED for lack of a reliable date (see the engineering
// report for the full reasoning): Śrī Advaita Ācārya's disappearance day,
// and the appearance days of Śrīla Gaurakiśora dāsa Bābājī and Śrīla
// Jagannātha dāsa Bābājī. No source consulted dates these - most Vaiṣṇava
// calendars simply don't observe them, rather than this being a research
// gap this file failed to close. Guessing a sacred date is worse than
// leaving it out.

import { toISTDateString } from "./vaishnava-calendar";

export type ObservanceKind = "appearance" | "disappearance" | "festival";

export type ObservanceEntry = {
  /** IAST name, e.g. "Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura". */
  name: string;
  /** Calendar date in Māyāpur/IST, "YYYY-MM-DD". */
  date: string;
  kind: ObservanceKind;
  /** One reverent sentence - what to remember or honor them for, not a
   * biography. Fixed liturgical text (see vaishnava-observances i18n note
   * in the engineering report) - never machine-translated. */
  note: string;
  /** Inward link to a topic page, when one exists (lib/topics.ts). */
  topicSlug?: string;
  /** Inward link fallback: a catalog search (transliteration-tolerant,
   * lib/search-expansion.ts) - used when no topic page exists yet. */
  searchQuery?: string;
};

// Chronological order, "rest of 2026" (from the date this was researched)
// through all of 2027 - same construction as EKADASHIS in
// vaishnava-calendar.ts. A personality whose only 2026 occurrence had
// already passed at research time appears once, for 2027; a personality
// with an occurrence still ahead in 2026 appears for both years.
export const OBSERVANCES: ObservanceEntry[] = [
  // ---- rest of 2026 ----
  {
    name: "Śrīla Sanātana Gosvāmī",
    date: "2026-07-29",
    kind: "disappearance",
    note: "The elder of the two brother-Gosvāmīs, who left behind wealth and high position to write the Hari-bhakti-vilāsa and Bṛhad-bhāgavatāmṛta.",
    searchQuery: "Sanatana Goswami",
  },
  {
    name: "Śrīla Gopāla Bhaṭṭa Gosvāmī",
    date: "2026-08-03",
    kind: "disappearance",
    note: "The compiler of the Hari-bhakti-vilāsa, whose deep love is said to have brought the young Śrī Rādhā-ramaṇa Deity to Vṛndāvana of His own accord.",
    searchQuery: "Gopala Bhatta",
  },
  {
    name: "Śrīla Rūpa Gosvāmī",
    date: "2026-08-24",
    kind: "disappearance",
    note: "The chief of the six Gosvāmīs of Vṛndāvana, who gave the world Bhakti-rasāmṛta-sindhu and showed that devotion itself has a taste.",
    searchQuery: "Rupa Goswami",
  },
  {
    name: "Śrī Balarāma",
    date: "2026-08-28",
    kind: "festival",
    note: "Kṛṣṇa's elder brother appeared as the first spiritual master, an eternal reservoir of strength and shelter for every devotee.",
    searchQuery: "Balarama",
  },
  {
    name: "Śrī Kṛṣṇa Janmāṣṭamī",
    date: "2026-09-04",
    kind: "festival",
    note: "The Lord of Goloka appeared at midnight in a Mathurā prison cell, and the whole universe rejoiced in secret.",
    topicSlug: "janmashtami",
  },
  {
    name: "Śrīla Prabhupāda",
    date: "2026-09-05",
    kind: "appearance",
    note: "The founder-ācārya of ISKCON, who carried the holy names across the world so that everyone, everywhere, could remember Kṛṣṇa.",
    topicSlug: "prabhupada",
  },
  {
    name: "Śrī Rādhāṣṭamī",
    date: "2026-09-19",
    kind: "festival",
    note: "The appearance of Śrīmatī Rādhārāṇī, the embodiment of pure love for Kṛṣṇa, whom even He Himself worships.",
    topicSlug: "radharani",
  },
  {
    name: "Śrī Vāmanadeva",
    date: "2026-09-23",
    kind: "festival",
    note: "The Lord appeared as a humble brāhmaṇa dwarf and reclaimed the three worlds with three small steps.",
    searchQuery: "Vamana",
  },
  {
    name: "Śrīla Bhaktivinoda Ṭhākura",
    date: "2026-09-24",
    kind: "appearance",
    note: "A householder-saint who wrote and printed Vaiṣṇava scripture with his own hands, and foresaw the holy name circling the globe.",
    searchQuery: "Bhaktivinoda",
  },
  {
    name: "Śrīla Raghunātha dāsa Gosvāmī",
    date: "2026-10-23",
    kind: "disappearance",
    note: "He renounced a vast inheritance for a life of tears and longing at Rādhā-kuṇḍa, the very embodiment of a devotee's yearning for service.",
    searchQuery: "Raghunatha Dasa",
  },
  {
    name: "Śrīla Raghunātha Bhaṭṭa Gosvāmī",
    date: "2026-10-23",
    kind: "disappearance",
    note: "A gentle reciter of Śrīmad-Bhāgavatam whose narrations are said to have moved even Śrī Caitanya Mahāprabhu to tears.",
    searchQuery: "Raghunatha Bhatta",
  },
  {
    name: "Govardhana Pūjā",
    date: "2026-11-10",
    kind: "festival",
    note: "Kṛṣṇa lifted Govardhana Hill on His little finger for seven days, sheltering all of Vraja from Indra's pride.",
    searchQuery: "Govardhan",
  },
  {
    name: "Śrīla Prabhupāda",
    date: "2026-11-13",
    kind: "disappearance",
    note: "On this day in 1977 he returned to Kṛṣṇa's eternal abode, leaving his books and his movement as his ever-living instruction.",
    topicSlug: "prabhupada",
  },
  {
    name: "Śrīla Gaurakiśora dāsa Bābājī",
    date: "2026-11-21",
    kind: "disappearance",
    note: "A wandering mendicant so absorbed in chanting that he barely noticed the world - the beloved teacher of Bhaktisiddhānta Sarasvatī Ṭhākura.",
    searchQuery: "Gaura Kishore",
  },
  {
    name: "Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura",
    date: "2026-12-27",
    kind: "disappearance",
    note: "He gave his whole life to seeing the holy name preached without compromise, and asked only that his disciples continue the work after him.",
    searchQuery: "Bhaktisiddhanta",
  },

  // ---- all of 2027 ----
  {
    name: "Śrīla Jīva Gosvāmī",
    date: "2027-01-11",
    kind: "disappearance",
    note: "The nephew of Rūpa and Sanātana, whose Ṣaṭ-sandarbhas laid the philosophical foundation of the entire Gauḍīya line.",
    searchQuery: "Jiva Goswami",
  },
  {
    name: "Śrī Advaita Ācārya",
    date: "2027-02-13",
    kind: "appearance",
    note: "His loud cries for the Lord's descent are said to have summoned Śrī Caitanya Mahāprabhu to this world.",
    searchQuery: "Advaita",
  },
  {
    name: "Śrī Nityānanda Prabhu",
    date: "2027-02-19",
    kind: "appearance",
    note: "Balarāma Himself descended as Kṛṣṇa's own brother, distributing love of God freely to the fallen and the exalted alike.",
    searchQuery: "Nityananda",
  },
  {
    name: "Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura",
    date: "2027-02-25",
    kind: "appearance",
    note: "The strict, uncompromising teacher who reestablished pure devotion in Bengal and sent Śrīla Prabhupāda west to build the movement he had only dreamed.",
    searchQuery: "Bhaktisiddhanta",
  },
  {
    name: "Śrīla Jagannātha dāsa Bābājī",
    date: "2027-03-09",
    kind: "disappearance",
    note: "A great-souled Vaiṣṇava said to have lived over a century absorbed in the holy name, revered by Bhaktivinoda Ṭhākura as his śikṣā-guru.",
    searchQuery: "Jagannatha Babaji",
  },
  {
    name: "Śrī Caitanya Mahāprabhu",
    date: "2027-03-22",
    kind: "appearance",
    note: "On this full moon - Gaura-pūrṇimā - the Golden Avatāra appeared to teach the world to chant the holy names in the mood of Śrīmatī Rādhārāṇī's own love.",
    searchQuery: "Chaitanya",
  },
  {
    name: "Śrī Rāma-navamī",
    date: "2027-04-15",
    kind: "festival",
    note: "Lord Rāmacandra appeared in Ayodhyā to show the world what a life of dharma looks like.",
    searchQuery: "Rama Navami",
  },
  {
    name: "Śrī Nṛsiṁhadeva",
    date: "2027-05-19",
    kind: "festival",
    note: "The Lord tore through a stone pillar in half-man, half-lion form to protect His young devotee Prahlāda.",
    topicSlug: "nrsimha",
  },
  {
    name: "Śrīla Bhaktivinoda Ṭhākura",
    date: "2027-07-04",
    kind: "disappearance",
    note: "He predicted a fortunate soul would carry Śrī Caitanya's message across the oceans - a prophecy his own spiritual grandson-disciple would fulfill.",
    searchQuery: "Bhaktivinoda",
  },
  {
    name: "Śrīla Sanātana Gosvāmī",
    date: "2027-07-18",
    kind: "disappearance",
    note: "The elder of the two brother-Gosvāmīs, who left behind wealth and high position to write the Hari-bhakti-vilāsa and Bṛhad-bhāgavatāmṛta.",
    searchQuery: "Sanatana Goswami",
  },
  {
    name: "Śrīla Gopāla Bhaṭṭa Gosvāmī",
    date: "2027-07-24",
    kind: "disappearance",
    note: "The compiler of the Hari-bhakti-vilāsa, whose deep love is said to have brought the young Śrī Rādhā-ramaṇa Deity to Vṛndāvana of His own accord.",
    searchQuery: "Gopala Bhatta",
  },
  {
    name: "Śrīla Rūpa Gosvāmī",
    date: "2027-08-13",
    kind: "disappearance",
    note: "The chief of the six Gosvāmīs of Vṛndāvana, who gave the world Bhakti-rasāmṛta-sindhu and showed that devotion itself has a taste.",
    searchQuery: "Rupa Goswami",
  },
  {
    name: "Śrī Balarāma",
    date: "2027-08-17",
    kind: "festival",
    note: "Kṛṣṇa's elder brother appeared as the first spiritual master, an eternal reservoir of strength and shelter for every devotee.",
    searchQuery: "Balarama",
  },
  {
    name: "Śrī Kṛṣṇa Janmāṣṭamī",
    date: "2027-08-25",
    kind: "festival",
    note: "The Lord of Goloka appeared at midnight in a Mathurā prison cell, and the whole universe rejoiced in secret.",
    topicSlug: "janmashtami",
  },
  {
    name: "Śrīla Prabhupāda",
    date: "2027-08-26",
    kind: "appearance",
    note: "The founder-ācārya of ISKCON, who carried the holy names across the world so that everyone, everywhere, could remember Kṛṣṇa.",
    topicSlug: "prabhupada",
  },
  {
    name: "Śrī Rādhāṣṭamī",
    date: "2027-09-08",
    kind: "festival",
    note: "The appearance of Śrīmatī Rādhārāṇī, the embodiment of pure love for Kṛṣṇa, whom even He Himself worships.",
    topicSlug: "radharani",
  },
  {
    name: "Śrī Vāmanadeva",
    date: "2027-09-12",
    kind: "festival",
    note: "The Lord appeared as a humble brāhmaṇa dwarf and reclaimed the three worlds with three small steps.",
    searchQuery: "Vamana",
  },
  {
    name: "Śrīla Bhaktivinoda Ṭhākura",
    date: "2027-09-13",
    kind: "appearance",
    note: "A householder-saint who wrote and printed Vaiṣṇava scripture with his own hands, and foresaw the holy name circling the globe.",
    searchQuery: "Bhaktivinoda",
  },
  {
    name: "Śrīla Raghunātha dāsa Gosvāmī",
    date: "2027-10-12",
    kind: "disappearance",
    note: "He renounced a vast inheritance for a life of tears and longing at Rādhā-kuṇḍa, the very embodiment of a devotee's yearning for service.",
    searchQuery: "Raghunatha Dasa",
  },
  {
    name: "Śrīla Raghunātha Bhaṭṭa Gosvāmī",
    date: "2027-10-12",
    kind: "disappearance",
    note: "A gentle reciter of Śrīmad-Bhāgavatam whose narrations are said to have moved even Śrī Caitanya Mahāprabhu to tears.",
    searchQuery: "Raghunatha Bhatta",
  },
  {
    name: "Govardhana Pūjā",
    date: "2027-10-30",
    kind: "festival",
    note: "Kṛṣṇa lifted Govardhana Hill on His little finger for seven days, sheltering all of Vraja from Indra's pride.",
    searchQuery: "Govardhan",
  },
  {
    name: "Śrīla Prabhupāda",
    date: "2027-11-02",
    kind: "disappearance",
    note: "On this day in 1977 he returned to Kṛṣṇa's eternal abode, leaving his books and his movement as his ever-living instruction.",
    topicSlug: "prabhupada",
  },
  {
    name: "Śrīla Gaurakiśora dāsa Bābājī",
    date: "2027-11-10",
    kind: "disappearance",
    note: "A wandering mendicant so absorbed in chanting that he barely noticed the world - the beloved teacher of Bhaktisiddhānta Sarasvatī Ṭhākura.",
    searchQuery: "Gaura Kishore",
  },
  {
    name: "Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura",
    date: "2027-12-17",
    kind: "disappearance",
    note: "He gave his whole life to seeing the holy name preached without compromise, and asked only that his disciples continue the work after him.",
    searchQuery: "Bhaktisiddhanta",
  },
  {
    name: "Śrīla Jīva Gosvāmī",
    date: "2027-12-30",
    kind: "disappearance",
    note: "The nephew of Rūpa and Sanātana, whose Ṣaṭ-sandarbhas laid the philosophical foundation of the entire Gauḍīya line.",
    searchQuery: "Jiva Goswami",
  },
];

/** Every observance today (Māyāpur/IST calendar date) - usually zero or
 * one, but occasionally more than one (e.g. Raghunātha dāsa and Raghunātha
 * Bhaṭṭa Gosvāmīs share a disappearance tithi), so this returns an array
 * rather than a single entry-or-null like todaysEkadashi. */
export function todaysObservances(now: Date = new Date()): ObservanceEntry[] {
  const today = toISTDateString(now);
  return OBSERVANCES.filter((entry) => entry.date === today);
}

/** The next `limit` observances at or after today, in chronological order -
 * for the /calendar page's merged list. Assumes OBSERVANCES is already in
 * chronological order (enforced by construction, not re-sorted here), same
 * assumption vaishnava-calendar.ts's nextEkadashi makes. */
export function upcomingObservances(now: Date = new Date(), limit = 10): ObservanceEntry[] {
  const today = toISTDateString(now);
  return OBSERVANCES.filter((entry) => entry.date >= today).slice(0, limit);
}
