// Topic collections: cross-category themes (e.g. everything about Śrī
// Rādhārāṇī) surfaced as their own page (/topic/<slug>) plus a homepage
// shelf. A topic is just a saved TITLE search over the catalog - see
// `titleKeywords` in lib/data.ts - so it needs no schema change and grows
// automatically as new videos sync. Add a topic by adding an entry here.
export type Topic = {
  slug: string;
  title: string;
  subtitle: string;
  /** Title keywords, matched case-insensitively as an OR of ILIKEs. */
  keywords: string[];
};

export const TOPICS: Record<string, Topic> = {
  radharani: {
    slug: "radharani",
    title: "Śrī Rādhārāṇī",
    subtitle: "Kirtans, katha and darshans glorifying the queen of Vrindavan.",
    // "radha" also catches Radharani / Radhashtami / Radha-Krishna; the rest
    // catch Radhe Radhe, Radhika, Barsana (Her village) and Kishori (Her name).
    keywords: ["radha", "radhe", "radhik", "barsana", "kishori"],
  },
};
