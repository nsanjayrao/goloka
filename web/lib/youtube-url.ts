// Pulls a YouTube video ID out of an arbitrary string - the payload of an
// Android share (from the YouTube app's "Share" sheet into Goloka) can be a
// full URL, a URL with extra tracking params, or free text with a URL
// buried in it (some apps prepend a title/caption before the link). Used by
// app/share-target/page.tsx, which receives whatever the OS hands it and
// must never throw on malformed input.
//
// A YouTube video ID is exactly 11 characters of [A-Za-z0-9_-].
const VIDEO_ID_PATTERN = "[A-Za-z0-9_-]{11}";
const VIDEO_ID_EXACT = new RegExp(`^${VIDEO_ID_PATTERN}$`);

/** youtube.com/watch?v=ID (any subdomain: www, m, music, or none), tolerant
 * of extra query params in any order ("&si=...", "?feature=share&v=..."). */
function idFromWatchUrl(input: string): { index: number; id: string } | null {
  const match = input.match(/(?:[\w-]+\.)?youtube\.com\/watch\?([^\s"'<>]*)/i);
  if (!match || match.index === undefined) return null;
  const id = new URLSearchParams(match[1]).get("v");
  return id && VIDEO_ID_EXACT.test(id) ? { index: match.index, id } : null;
}

/** A single path-segment shape: youtu.be/ID, youtube.com/live/ID,
 * youtube.com/shorts/ID - the ID is the path segment right after the
 * marker, stopping at the next "/", "?", "#", whitespace, or quote. */
function idFromPathUrl(
  input: string,
  hostAndSegment: string
): { index: number; id: string } | null {
  const pattern = new RegExp(`${hostAndSegment}([^\\s?&#"'<>/]*)`, "i");
  const match = input.match(pattern);
  if (!match || match.index === undefined) return null;
  return VIDEO_ID_EXACT.test(match[1]) ? { index: match.index, id: match[1] } : null;
}

const EXTRACTORS: Array<(input: string) => { index: number; id: string } | null> = [
  idFromWatchUrl,
  (input) => idFromPathUrl(input, "youtu\\.be/"),
  (input) => idFromPathUrl(input, "youtube\\.com/live/"),
  (input) => idFromPathUrl(input, "youtube\\.com/shorts/"),
];

/**
 * Finds the first YouTube video ID in `input`, checking whichever of the
 * known URL shapes (watch/youtu.be/live/shorts, any of www/m/music
 * subdomains) appears earliest left-to-right. Returns null for anything
 * that isn't a recognizable YouTube link - never throws, so callers can
 * always fall back to a plain text search.
 */
export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;

  let best: { index: number; id: string } | null = null;
  for (const extract of EXTRACTORS) {
    const found = extract(input);
    if (found && (!best || found.index < best.index)) best = found;
  }
  return best?.id ?? null;
}
