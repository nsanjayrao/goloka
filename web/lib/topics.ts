// Topic collections: cross-category themes (e.g. everything about Śrī
// Rādhārāṇī) surfaced as their own page (/topic/<slug>) plus, optionally, a
// homepage shelf. A topic is just a saved TITLE search over the catalog - see
// `titleKeywords` in lib/data.ts - so it needs no schema change and grows
// automatically as new videos sync. Add a topic by adding an entry here; the
// page (app/topic/[slug]/page.tsx) and the home page both read this registry,
// so nothing else needs editing.
/** A fixed Gregorian month/day window (inclusive) approximating a festival's
 * date - real Vedic festival dates (Janmashtami, Nrsimha Chaturdashi, ...)
 * follow the lunar calendar and shift every year, so this is a deliberate
 * approximation, not the precise tithi. Adjust the dates here by hand each
 * year if a festival falls meaningfully outside its window; a precise
 * version would need a Panchang/ephemeris calculation, which is out of scope
 * for now. `startMonth`/`endMonth` are 1-12 (January = 1).
 */
export type FestivalWindow = {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export type Topic = {
  slug: string;
  title: string;
  subtitle: string;
  /** Title keywords, matched case-insensitively as an OR of ILIKEs. */
  keywords: string[];
  /** Show a shelf for this topic on the home page. Keep this list short -
   * every entry is another shelf competing for the fold. */
  showOnHomepage?: boolean;
  /** When set, this topic gets an extra homepage shelf (alongside the
   * hand-picked Featured shelf, not replacing it) while `now` falls inside
   * the window - see getActiveFestivalTopic(). */
  festivalWindow?: FestivalWindow;
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
    // Janmashtami usually falls in August, occasionally slipping into early
    // September - this window is deliberately a bit wider than the single
    // day to cover the run-up and follow-up celebration content too.
    festivalWindow: { startMonth: 8, startDay: 10, endMonth: 9, endDay: 10 },
  },
  nrsimha: {
    slug: "nrsimha",
    title: "Śrī Nṛsiṁha",
    subtitle: "The Lord's half-man, half-lion form, protector of His devotees.",
    keywords: ["nrsimha", "narasimha", "nrisimha", "nrisingha"],
    // Nrsimha Chaturdashi usually falls in late April or early-to-mid May.
    festivalWindow: { startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  },
};

/** Whether `now` falls within a topic's festivalWindow (inclusive), by
 * calendar month+day only (the year is ignored, since the window is a
 * yearly-recurring approximation). Handles a window that wraps New Year's
 * (e.g. startMonth 12 -> endMonth 1), though none of the topics above need
 * that today. */
function isWithinFestivalWindow(window: FestivalWindow, now: Date): boolean {
  const month = now.getMonth() + 1; // JS getMonth() is 0-11
  const day = now.getDate();
  const asNumber = (m: number, d: number) => m * 100 + d;
  const current = asNumber(month, day);
  const start = asNumber(window.startMonth, window.startDay);
  const end = asNumber(window.endMonth, window.endDay);
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

/** The topic whose festivalWindow is currently active, if any (the first
 * match wins if two windows somehow overlap - not expected with the two
 * defined above). Returns null the rest of the year. */
export function getActiveFestivalTopic(now: Date = new Date()): Topic | null {
  return TOPIC_LIST.find((topic) => topic.festivalWindow && isWithinFestivalWindow(topic.festivalWindow, now)) ?? null;
}

/** All topics, in registry order - for pages that need to iterate every one
 * (e.g. generateStaticParams). */
export const TOPIC_LIST: Topic[] = Object.values(TOPICS);
