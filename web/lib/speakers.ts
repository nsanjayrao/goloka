// The "Spiritual Leaders" directory (/leaders) is a curated subset of
// worker/channels.json: the individual teachers/speakers, not the temple,
// media, or kids/cooking channels also in the catalog. A hand-picked list
// here (like lib/topics.ts) rather than a DB flag - it's an editorial
// distinction ("is this a person teaching, or an institution/show"), not
// something the sync worker can infer.
//
// Deliberately NO bios here: writing unverified biographical claims about
// real, living spiritual teachers risks getting something wrong about them -
// the directory shows only what the catalog itself can vouch for (their
// name, avatar, and how many of their videos are indexed). Short factual
// bios are a fine future addition, but that's the owner's editorial call to
// write, not something to fabricate.
/** A channel's title, with YouTube channel-branding stripped, for the one
 * place Goloka promises a NAME rather than a channel: the /leaders directory.
 *
 * The `channels.title` column is whatever the teacher's channel is called on
 * YouTube, and it shows: four of the twenty-one carry a trailing space, five
 * end in "Official", one in "Media", one is "(Official)". Printing those
 * under a face reads as branding where a devotee expects a person.
 *
 * DELIBERATELY MECHANICAL, and deliberately conservative. It removes suffixes
 * and whitespace; it never rewrites, expands, transliterates or re-orders a
 * name. That restraint is the same reason this file carries no bios: getting
 * a living spiritual teacher's name wrong is worse than showing it plainly.
 *
 * KNOWN CASES THIS DOES NOT TOUCH, on purpose - each needs the owner's
 * editorial call, not a regex:
 *   @myashraya            -> "My Ashraya" (a channel brand, not a person)
 *   @hdgoswami            -> "H.D.Goswami" (missing spaces)
 *   @bhaktivikasaswami    -> "भक्ति विकास स्वामी - Bhakti Vikasa Swami"
 *   @nityamuktadasa1524   -> "Nitya Mukta Dāsa తిరుపతి ధామ్" (name + dhāma)
 * If a curated display name is ever wanted, add it beside the handle below
 * and prefer it here - do not widen the regex to guess at these. */
export function speakerName(title: string): string {
  return title
    .replace(/\s*\((?:official|officia?l channel)\)\s*$/i, "")
    .replace(/\s+(?:official|media)\s*$/i, "")
    .trim();
}

export const SPEAKER_HANDLES = [
  "@GaurGopalDas",
  "@gaurangadas_official",
  "@bhakticharuswami",
  "@radhanathswami",
  "@vaisesikadasa108",
  "@sacinandanaswamiyoutube",
  "@chaitanyacharanofficial",
  "@myashraya",
  "@bhaktivikasaswami",
  "@devamritaswamimedia",
  "@indradyumnaswamiofficial",
  "@niranjanaswamiofficial",
  "@mediakadambakananaswami",
  "@girirajswamiofficial",
  "@jayapatakaswamiofficial",
  "@romapadaswamichannel",
  "@hdgoswami",
  "@nitaisevinimatajiofficial",
  "@punyamkrsnakathamritam",
  // Telugu teachers (added 2026-08-01 with the Telugu channels). Only the
  // two individuals NEW to the catalogue are here: the sixth Telugu channel,
  // @gaurangadarshandas.telugu, is Gauranga Darshan Das - who already appears
  // above as @gaurangadas_official - and listing both would show one teacher
  // twice in a directory of people. If you'd rather the directory be per
  // CHANNEL than per PERSON, add it; that's an editorial call, not a bug.
  "@chaitanyakrishnadasa",
  "@nityamuktadasa1524",
];
