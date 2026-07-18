// Ekādaśī registry: the sacred fasting day that falls roughly every two
// weeks on the lunar calendar. Unlike the fixed Gregorian festivalWindow
// approximations in topics.ts, an ekādaśī's DATE moves with the moon and
// must be looked up per-occurrence - there is no month/day formula for it,
// so this is a hand-researched table rather than computed.
//
// CANONICAL LOCATION: dates are for Śrī Māyāpur-dhāma, IST (UTC+5:30) -
// ISKCON's own reference calendar location, per the same "pick one location
// and document it" philosophy as topics.ts's festivalWindow comments.
// Ekādaśī is a sunrise-tithi rule, so it can (and does) fall a calendar day
// earlier or later for a devotee elsewhere in the world; Māyāpur is the
// deliberate single source of truth here, not a claim that it's the only
// valid date everywhere.
//
// SOURCES (cross-checked across independent Vaishnava calendars; where two
// disagreed by a day - a real, known effect of the sunrise-tithi rule - the
// Māyāpur-specific source or the majority won; see the engineering report
// for the day-by-day reasoning):
//   - https://harekrishnacalendar.com/vaishnava-calendars/category/ekadasi/list/
//     (explicitly Māyāpur, India)
//   - https://www.drikpanchang.com/iskcon/iskcon-ekadashi-list.html?geoname-id=1275004
//     (ISKCON list, Kolkata - same IST timezone and near-identical longitude
//     to Māyāpur)
//   - https://vrajvrindavan.com/ekadashi-dates/
//   - https://guptvrindavandham.org/blogs/iskcon-ekadashi-list/
//
// Re-verify against a current Māyāpur pañjikā before each new year - lunar
// calendars occasionally get republisher corrections, and 2027's dates here
// are drawn from one source (drikpanchang) rather than cross-checked like
// the 2026 dates, for lack of a second full-year 2027 table at research
// time.
export type EkadashiEntry = {
  /** IAST name, e.g. "Yoginī Ekādaśī". */
  name: string;
  /** Calendar date in Māyāpur/IST, "YYYY-MM-DD". */
  date: string;
  /** Optional short gloss - only added where it teaches something the name
   * alone doesn't (e.g. marking Cāturmāsya's start/end). */
  note?: string;
};

export const EKADASHIS: EkadashiEntry[] = [
  // ---- rest of 2026 ----
  { name: "Śayanī Ekādaśī", date: "2026-07-25", note: "Hari-śayana — Lord Viṣṇu's four-month yogic sleep (Cāturmāsya) begins." },
  { name: "Kāmikā Ekādaśī", date: "2026-08-09" },
  { name: "Pavitrāropaṇā Ekādaśī", date: "2026-08-23" },
  { name: "Annadā Ekādaśī", date: "2026-09-07" },
  { name: "Pārśva Ekādaśī", date: "2026-09-22" },
  { name: "Indirā Ekādaśī", date: "2026-10-06" },
  { name: "Pāśāṅkuśā Ekādaśī", date: "2026-10-22" },
  { name: "Rāmā Ekādaśī", date: "2026-11-05" },
  { name: "Utthāna Ekādaśī", date: "2026-11-21", note: "Prabodhinī — Cāturmāsya ends; the Lord rises from His yogic sleep." },
  { name: "Utpannā Ekādaśī", date: "2026-12-04" },
  { name: "Mokṣadā Ekādaśī", date: "2026-12-20" },

  // ---- all of 2027 ----
  { name: "Saphalā Ekādaśī", date: "2027-01-03" },
  { name: "Putradā Ekādaśī", date: "2027-01-19" },
  { name: "Ṣaṭ-tilā Ekādaśī", date: "2027-02-02" },
  { name: "Bhaimī Ekādaśī", date: "2027-02-17" },
  { name: "Vijayā Ekādaśī", date: "2027-03-04" },
  { name: "Āmalakī Ekādaśī", date: "2027-03-19" },
  { name: "Pāpamocanī Ekādaśī", date: "2027-04-02" },
  { name: "Kāmadā Ekādaśī", date: "2027-04-17" },
  { name: "Varūthinī Ekādaśī", date: "2027-05-02" },
  { name: "Mohinī Ekādaśī", date: "2027-05-16" },
  { name: "Aparā Ekādaśī", date: "2027-06-01" },
  { name: "Pāṇḍava Nirjalā Ekādaśī", date: "2027-06-15" },
  { name: "Yoginī Ekādaśī", date: "2027-06-30" },
  { name: "Śayanī Ekādaśī", date: "2027-07-14", note: "Hari-śayana — Cāturmāsya begins." },
  { name: "Kāmikā Ekādaśī", date: "2027-07-30" },
  { name: "Pavitrāropaṇā Ekādaśī", date: "2027-08-13" },
  { name: "Annadā Ekādaśī", date: "2027-08-28" },
  { name: "Pārśva Ekādaśī", date: "2027-09-12" },
  { name: "Indirā Ekādaśī", date: "2027-09-26" },
  { name: "Pāśāṅkuśā Ekādaśī", date: "2027-10-11" },
  { name: "Rāmā Ekādaśī", date: "2027-10-26" },
  { name: "Utthāna Ekādaśī", date: "2027-11-10", note: "Prabodhinī — Cāturmāsya ends." },
  { name: "Utpannā Ekādaśī", date: "2027-11-24" },
  { name: "Mokṣadā Ekādaśī", date: "2027-12-09" },
  { name: "Saphalā Ekādaśī", date: "2027-12-23" },
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The calendar date (YYYY-MM-DD) `now` falls on on the IST wall clock -
 * `Date.getTime()` is timezone-agnostic (epoch millis), so shifting by the
 * IST offset and reading the UTC fields back out gives IST's own date
 * without needing a timezone library. */
function toISTDateString(now: Date): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's ekādaśī, or null on an ordinary day. Compares by IST calendar
 * date (see toISTDateString), matching the registry's Māyāpur/IST dates. */
export function todaysEkadashi(now: Date = new Date()): EkadashiEntry | null {
  const today = toISTDateString(now);
  return EKADASHIS.find((entry) => entry.date === today) ?? null;
}

/** The next upcoming ekādaśī - TODAY's, if today is one, otherwise the
 * soonest one still ahead. Assumes EKADASHIS is in chronological order
 * (enforced by construction, not re-sorted here) and returns null only if
 * `now` is past the whole registry - re-run the research past 2027. */
export function nextEkadashi(now: Date = new Date()): EkadashiEntry | null {
  const today = toISTDateString(now);
  // "YYYY-MM-DD" strings compare lexicographically the same as chronologically.
  return EKADASHIS.find((entry) => entry.date >= today) ?? null;
}

/** Whole days between `now` (IST calendar date) and a registry "YYYY-MM-DD"
 * date. 0 means today. Both sides are read as IST-midnight-anchored UTC
 * instants so daylight/offset quirks never off-by-one the count. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const todayMidnightUTC = Date.parse(`${toISTDateString(now)}T00:00:00Z`);
  const targetMidnightUTC = Date.parse(`${date}T00:00:00Z`);
  return Math.round((targetMidnightUTC - todayMidnightUTC) / (24 * 60 * 60 * 1000));
}
