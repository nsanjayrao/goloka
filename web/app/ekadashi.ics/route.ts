import { EKADASHIS } from "@/lib/vaishnava-calendar";
import { SITE_URL } from "@/lib/site";

// A plain .ics download of the whole ekadashi registry - no login, no
// per-user state, just a static file any calendar app can subscribe to or
// import once. Regenerated from the same EKADASHIS table the home page
// strip reads, so the two can never drift apart.

// RFC 5545 TEXT escaping: backslash first (so it doesn't double-escape the
// other replacements), then the characters that are structurally special
// in an ICS value.
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// RFC 5545 wants lines folded at 75 octets, continuation lines starting
// with a single space. This folds by UTF-16 code unit rather than exact
// UTF-8 octets - close enough for our short IAST-diacritic lines, and every
// mainstream calendar app tolerates an unfolded long line anyway, so this
// is a courtesy to strict parsers, not load-bearing.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

// "YYYY-MM-DD" -> "YYYYMMDD" (the VALUE=DATE form for an all-day event).
function toICSDate(date: string): string {
  return date.replace(/-/g, "");
}

// The all-day DTEND is EXCLUSIVE per RFC 5545 - a one-day event's end date
// is the day after it starts.
function nextDayICS(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function buildICS(): string {
  const host = new URL(SITE_URL).host;
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Goloka//Ekadashi Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Goloka — Ekādaśī",
    "X-WR-CALDESC:Ekādaśī fasting days (Śrī Māyāpur-dhāma, IST) from the Goloka Vaiṣṇava calendar.",
  ];

  for (const entry of EKADASHIS) {
    const start = toICSDate(entry.date);
    const end = nextDayICS(entry.date);
    lines.push(
      "BEGIN:VEVENT",
      `UID:ekadashi-${start}@${host}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeText(entry.name)}`
    );
    if (entry.note) {
      lines.push(`DESCRIPTION:${escapeText(entry.note)}`);
    }
    lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// The registry only changes when someone edits vaishnava-calendar.ts (a
// deploy), so this can cache hard - long max-age plus a long
// stale-while-revalidate so a CDN never needs to regenerate it on demand.
export async function GET() {
  return new Response(buildICS(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="goloka-ekadashi.ics"',
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
    },
  });
}
