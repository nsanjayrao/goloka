// The Sacred Library (/books): Śrīla Prabhupāda's books as a curated,
// hand-edited registry - the same editorial pattern as lib/topics.ts and
// lib/speakers.ts. Goloka indexes and links out, never hosts: every entry
// carries a "read free" link to vedabase.io (the BBT's own online library)
// and a "get the book" link to the official BBT store. No cover artwork on
// purpose - hotlinking BBT covers is rights-murky, so the cards are
// styled typographic "spines" in the site's own design system.
//
// Store links use the store's SEARCH page rather than deep product URLs:
// Shopify product slugs change with reprints/editions, search is stable.
// OWNER: add, remove, and reorder freely - order here is display order.

export type Book = {
  slug: string;
  title: string;
  /** Sanskrit/short name shown big on the spine when the title is long. */
  spine: string;
  subtitle: string;
  vedabaseUrl: string;
  storeUrl: string;
  /** Inward link: a Goloka topic page with classes on this book. */
  topicSlug?: string;
  /** Inward link fallback: a catalog search for lectures on this book. */
  searchQuery?: string;
};

const STORE = "https://store.krishna.com/search?q=";

export const BOOKS: Book[] = [
  {
    slug: "bhagavad-gita",
    title: "Bhagavad-gītā As It Is",
    spine: "Bhagavad-gītā",
    subtitle: "Kṛṣṇa's song to Arjuna — the essence of all Vedic wisdom.",
    vedabaseUrl: "https://vedabase.io/en/library/bg/",
    storeUrl: `${STORE}bhagavad-gita`,
    topicSlug: "gita",
  },
  {
    slug: "srimad-bhagavatam",
    title: "Śrīmad-Bhāgavatam",
    spine: "Śrīmad-Bhāgavatam",
    subtitle: "The ripened fruit of the Vedic tree — 18,000 verses of kṛṣṇa-kathā.",
    vedabaseUrl: "https://vedabase.io/en/library/sb/",
    storeUrl: `${STORE}srimad-bhagavatam`,
    searchQuery: "bhagavatam",
  },
  {
    slug: "caitanya-caritamrta",
    title: "Śrī Caitanya-caritāmṛta",
    spine: "Caitanya-caritāmṛta",
    subtitle: "The life and teachings of Śrī Caitanya Mahāprabhu.",
    vedabaseUrl: "https://vedabase.io/en/library/cc/",
    storeUrl: `${STORE}caitanya-caritamrta`,
    searchQuery: "caitanya caritamrta",
  },
  {
    slug: "krsna-book",
    title: "KṚṢṆA, the Supreme Personality of Godhead",
    spine: "Kṛṣṇa Book",
    subtitle: "The pastimes of Kṛṣṇa from the Bhāgavatam's Tenth Canto, retold.",
    vedabaseUrl: "https://vedabase.io/en/library/kb/",
    storeUrl: `${STORE}krsna-book`,
    searchQuery: "krishna book",
  },
  {
    slug: "nectar-of-devotion",
    title: "The Nectar of Devotion",
    spine: "Nectar of Devotion",
    subtitle: "The complete science of bhakti-yoga — Rūpa Gosvāmī's Bhakti-rasāmṛta-sindhu.",
    vedabaseUrl: "https://vedabase.io/en/library/nod/",
    storeUrl: `${STORE}nectar-of-devotion`,
    searchQuery: "nectar of devotion",
  },
  {
    slug: "nectar-of-instruction",
    title: "The Nectar of Instruction",
    spine: "Upadeśāmṛta",
    subtitle: "Eleven verses of essential instruction from Śrīla Rūpa Gosvāmī.",
    vedabaseUrl: "https://vedabase.io/en/library/noi/",
    storeUrl: `${STORE}nectar-of-instruction`,
    searchQuery: "nectar of instruction",
  },
  {
    slug: "sri-isopanisad",
    title: "Śrī Īśopaniṣad",
    spine: "Śrī Īśopaniṣad",
    subtitle: "Eighteen mantras on the Personhood of God — the foremost Upaniṣad.",
    vedabaseUrl: "https://vedabase.io/en/library/iso/",
    storeUrl: `${STORE}isopanisad`,
    searchQuery: "isopanisad",
  },
  {
    slug: "teachings-of-lord-caitanya",
    title: "Teachings of Lord Caitanya",
    spine: "Teachings of Lord Caitanya",
    subtitle: "Mahāprabhu's philosophy in summary study.",
    vedabaseUrl: "https://vedabase.io/en/library/tlc/",
    storeUrl: `${STORE}teachings-of-lord-caitanya`,
    searchQuery: "teachings of lord caitanya",
  },
  {
    slug: "science-of-self-realization",
    title: "The Science of Self-Realization",
    spine: "Science of Self-Realization",
    subtitle: "Interviews, lectures and essays introducing Kṛṣṇa consciousness.",
    vedabaseUrl: "https://vedabase.io/en/library/ssr/",
    storeUrl: `${STORE}science-of-self-realization`,
    searchQuery: "self realization",
  },
  {
    slug: "perfect-questions",
    title: "Perfect Questions, Perfect Answers",
    spine: "Perfect Questions",
    subtitle: "Conversations with a Peace Corps volunteer — a perfect first book.",
    vedabaseUrl: "https://vedabase.io/en/library/pqpa/",
    storeUrl: `${STORE}perfect-questions-perfect-answers`,
    searchQuery: "perfect questions",
  },
];

// "Devotional essentials" (owner decision 2026-07-18): OFFICIAL
// BBT/ISKCON store links only - no third-party sellers, ever. Same
// stable store-search URLs as the books.
export type Essential = { title: string; subtitle: string; url: string };

export const ESSENTIALS: Essential[] = [
  {
    title: "Japa mālā & bead bags",
    subtitle: "Tulasī chanting beads and bags for the daily rounds.",
    url: `${STORE}japa+mala`,
  },
  {
    title: "Deity worship",
    subtitle: "Ārati paraphernalia, ghee lamps and altar items.",
    url: `${STORE}arati`,
  },
  {
    title: "Incense",
    subtitle: "Temple-grade incense for the home altar.",
    url: `${STORE}incense`,
  },
  {
    title: "Kirtan instruments",
    subtitle: "Karatālas, mṛdaṅgas and harmoniums.",
    url: `${STORE}kartals`,
  },
];
