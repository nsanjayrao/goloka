// Topic collections: cross-category themes (e.g. everything about Śrī
// Rādhārāṇī) surfaced as their own page (/topic/<slug>) plus, optionally, a
// homepage shelf. A topic is just a saved TITLE search over the catalog - see
// `titleKeywords` in lib/data.ts - so it needs no schema change and grows
// automatically as new videos sync. Add a topic by adding an entry here; the
// page (app/topic/[slug]/page.tsx) and the home page both read this registry,
// so nothing else needs editing.
export type Topic = {
  slug: string;
  title: string;
  subtitle: string;
  /** Title keywords, matched case-insensitively as an OR of ILIKEs. */
  keywords: string[];
  /** Show a shelf for this topic on the home page. Keep this list short -
   * every entry is another shelf competing for the fold. */
  showOnHomepage?: boolean;
};

export const TOPICS: Record<string, Topic> = {
  radharani: {
    slug: "radharani",
    title: "Śrī Rādhārāṇī",
    subtitle: "Kirtans, katha and darshans glorifying the queen of Vrindavan.",
    // "radha" also catches Radharani / Radhashtami / Radha-Krishna; the rest
    // catch Radhe Radhe, Radhika, Barsana (Her village) and Kishori (Her name).
    keywords: ["radha", "radhe", "radhik", "barsana", "kishori"],
    showOnHomepage: true,
  },
  vrindavan: {
    slug: "vrindavan",
    title: "Śrī Vṛndāvana",
    subtitle: "The land of Krishna's pastimes - temples, parikrama and katha.",
    keywords: ["vrindavan", "vrndavan", "brindavan"],
    showOnHomepage: true,
  },
  gita: {
    slug: "gita",
    title: "Bhagavad-gītā",
    subtitle: "Chapter-by-chapter classes on Krishna's song to Arjuna.",
    keywords: ["gita", "bhagavadgita"],
    showOnHomepage: true,
  },
  janmashtami: {
    slug: "janmashtami",
    title: "Śrī Kṛṣṇa Janmāṣṭamī",
    subtitle: "Celebrations of Krishna's appearance day.",
    keywords: ["janmashtami", "janmastami", "gokulashtami"],
  },
  nrsimha: {
    slug: "nrsimha",
    title: "Śrī Nṛsiṁha",
    subtitle: "The Lord's half-man, half-lion form, protector of His devotees.",
    keywords: ["nrsimha", "narasimha", "nrisimha", "nrisingha"],
  },
};

/** All topics, in registry order - for pages that need to iterate every one
 * (e.g. generateStaticParams). */
export const TOPIC_LIST: Topic[] = Object.values(TOPICS);
