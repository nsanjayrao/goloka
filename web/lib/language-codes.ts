// Video.language (lib/types.ts) is a canonical English language name from
// the worker's classifier - "Hindi", "Russian", null, etc. This maps those
// names to compact 2-letter display codes for the card's language chip.
const LANGUAGE_CODES: Record<string, string> = {
  English: "EN",
  Hindi: "HI",
  Bengali: "BN",
  Russian: "RU",
  Spanish: "ES",
  Portuguese: "PT",
  Tamil: "TA",
  Telugu: "TE",
  Sanskrit: "SA",
  Marathi: "MR",
  Gujarati: "GU",
  Kannada: "KN",
  Malayalam: "ML",
  Punjabi: "PA",
  Ukrainian: "UK",
  Hungarian: "HU",
  Italian: "IT",
  Turkish: "TR",
  Chinese: "ZH",
  Dutch: "NL",
  Polish: "PL",
  German: "DE",
  French: "FR",
  Lithuanian: "LT",
};

/** Uppercase 2-letter code for a canonical language name, or null when the
 * name is missing or not in the map. */
export function languageCode(name: string | null): string | null {
  if (!name) return null;
  return LANGUAGE_CODES[name] ?? null;
}
