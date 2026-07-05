// Small, dependency-free formatters. Both take the raw column values from
// `videos` (see db/schema.sql) and turn them into the strings the UI shows.

/** duration_seconds (int) -> "1:23:45" or "4:05". */
export function formatDuration(totalSeconds: number | null): string {
  // duration_seconds should never be negative (worker/sync.py's ISO 8601
  // duration parser only ever adds), but guard anyway rather than print a
  // nonsensical "-1:23".
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds < 0) return "";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Abbreviations that must survive the ALL-CAPS -> Title Case conversion
// below: honorifics (His Grace / His Holiness), scripture names
// (Srimad-Bhagavatam, Bhagavad-gita, Chaitanya-charitamrita), and the
// organization itself. Compared case-insensitively, restored as written here.
const KEEP_UPPERCASE = new Set(["HG", "HH", "SB", "BG", "CC", "ISKCON", "Q&A"]);

/**
 * Raw YouTube titles -> display titles (DESIGN.md "Video card": titles are
 * cleaned, never raw). YouTube titles optimize for the YouTube algorithm -
 * #hashtags, ALL CAPS, decorative separators - which reads as noise in an
 * Apple-style UI. This cleans for DISPLAY only; the database keeps the
 * original (search still matches the raw title).
 */
export function cleanTitle(rawTitle: string): string {
  let title = rawTitle
    .replace(/#[^\s#]+/g, " ") // drop #hashtags entirely
    .replace(/\s+/g, " ") // collapse runs of whitespace
    // Trim separator junk left dangling at either end after the removals
    // above (a title like "Kirtan ॥ #shorts" ends as "Kirtan ॥"). ॥ (the
    // Sanskrit/Hindi double danda marking a verse/mantra's end) is
    // deliberately NOT in this class - it's meaningful devotional
    // punctuation throughout this catalog's titles, not decorative junk.
    .replace(/^[\s|·•—–-]+|[\s|·•—–-]+$/g, "");

  // Only de-shout titles that are MOSTLY capitals. Counting letters (not
  // characters) keeps digits/punctuation from skewing the ratio, and the
  // >= 12 floor stops short titles like "BG 2.13" from tripping it.
  const letters = title.replace(/[^a-zA-Z]/g, "");
  const uppercase = letters.replace(/[^A-Z]/g, "");
  if (letters.length >= 12 && uppercase.length / letters.length > 0.7) {
    title = title
      .toLowerCase()
      .replace(/[a-z][a-z'&.]*/g, (word) => {
        const kept = word.toUpperCase();
        if (KEEP_UPPERCASE.has(kept)) return kept;
        return word[0].toUpperCase() + word.slice(1);
      });
  }

  // If cleaning nuked everything (a title that was ONLY hashtags), the raw
  // title is still better than an empty string.
  return title || rawTitle;
}

const viewsFormatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** view_count (int) -> "1.2M views" / "3.4K views" / "" when unknown. */
export function formatViews(count: number | null): string {
  if (count == null || Number.isNaN(count) || count < 0) return "";
  return `${viewsFormatter.format(count)} views`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });

/** published_at (timestamptz string) -> "2 days ago". */
export function formatRelativeDate(isoString: string | null): string {
  if (!isoString) return "";

  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "";

  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return "just now";

  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (absSeconds >= unitSeconds) {
      const value = Math.round(diffSeconds / unitSeconds);
      return relativeFormatter.format(value, unit);
    }
  }
  return "just now";
}
