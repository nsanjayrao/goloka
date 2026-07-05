// Curated Srila Prabhupada quotes for the home "Daily Inspiration" band
// (DESIGN.md #6). One is chosen per calendar day (deterministic), so the
// band rotates daily with no backend and never changes mid-day.
//
// OWNER: review, correct, and expand this list freely — quote selection and
// sourcing is devotional editorial, not an engineering call. These are
// widely-attributed lines; verify wording/attribution against source
// lectures and purports before treating them as authoritative.

export type Quote = { text: string; source: string };

const QUOTES: Quote[] = [
  { text: "Chant Hare Krishna and be happy.", source: "Srila Prabhupada" },
  {
    text: "The more we try to give happiness to others, the more happiness we will get.",
    source: "Srila Prabhupada",
  },
  {
    text: "Simple living and high thinking is the perfection of human life.",
    source: "Srila Prabhupada",
  },
  {
    text: "The soul is eternal — it is never born and it never dies.",
    source: "Srila Prabhupada",
  },
  {
    text: "Just try to understand Krishna, and your life will be successful.",
    source: "Srila Prabhupada",
  },
  {
    text: "Real happiness is to serve Krishna with love and devotion.",
    source: "Srila Prabhupada",
  },
  {
    text: "A devotee is never disturbed, even in the midst of the greatest calamity.",
    source: "Srila Prabhupada",
  },
  {
    text: "Life is meant for realizing our eternal relationship with God.",
    source: "Srila Prabhupada",
  },
  {
    text: "Everything belongs to Krishna, and we are all His eternal servants.",
    source: "Srila Prabhupada",
  },
  {
    text: "Chanting the holy name cleanses the heart of all its dust.",
    source: "Srila Prabhupada",
  },
  {
    text: "We are not this body; we are spirit soul, part and parcel of God.",
    source: "Srila Prabhupada",
  },
  {
    text: "The purpose of human life is to inquire about the Absolute Truth.",
    source: "Srila Prabhupada",
  },
  {
    text: "Surrender unto Krishna and be free from all anxiety.",
    source: "Srila Prabhupada",
  },
  {
    text: "Krishna is the reservoir of all pleasure.",
    source: "Srila Prabhupada",
  },
  {
    text: "In the association of devotees, one can understand Krishna.",
    source: "Srila Prabhupada",
  },
  {
    text: "The greatest wealth is contentment.",
    source: "Srila Prabhupada",
  },
  {
    text: "Human life is meant for self-realization, not for competing like the animals.",
    source: "Srila Prabhupada",
  },
  {
    text: "A saintly person is tolerant, merciful, and a friend to all living beings.",
    source: "Srila Prabhupada",
  },
  {
    text: "Love of God is the ultimate goal of all genuine religion.",
    source: "Srila Prabhupada",
  },
  {
    text: "Be the master of the mind, not its servant.",
    source: "Srila Prabhupada",
  },
  {
    text: "By chanting the holy name, one is at once in touch with Krishna.",
    source: "Srila Prabhupada",
  },
  {
    text: "This human form of life is a chance to solve all the problems of life.",
    source: "Srila Prabhupada",
  },
  {
    text: "Everything belongs to Krishna, so everything should be used in His service.",
    source: "Srila Prabhupada",
  },
  {
    text: "Real education means to know that we are eternal servants of God.",
    source: "Srila Prabhupada",
  },
  {
    text: "One who is fixed in devotion is not disturbed by happiness or distress.",
    source: "Srila Prabhupada",
  },
  {
    text: "The tongue is best engaged in glorifying Krishna and honoring His prasadam.",
    source: "Srila Prabhupada",
  },
  {
    text: "Where there is Krishna, there is no scarcity — of anything.",
    source: "Srila Prabhupada",
  },
  {
    text: "Devotional service is so pure that even a little of it saves one from great danger.",
    source: "Srila Prabhupada",
  },
  {
    text: "Simply hear about Krishna, and your heart will become peaceful.",
    source: "Srila Prabhupada",
  },
];

/**
 * The quote for `now`'s calendar day, cycling through the list. Uses UTC
 * day-of-year so every visitor on a given render sees the same one, and it
 * only changes at the day boundary (home ISR revalidates within 30 min).
 */
export function quoteOfTheDay(now: Date = new Date()): Quote {
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayOfYear = Math.floor((today - startOfYear) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}
