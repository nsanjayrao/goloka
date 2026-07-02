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
