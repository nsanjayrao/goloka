// The Newcomer's Path (/start): a hand-curated, ORDERED registry for
// someone who has never encountered Kṛṣṇa consciousness before - same
// editorial pattern as lib/books.ts and lib/temples.ts (a small hand-edited
// array, not a database table). Order here IS the journey's order; the page
// just renders it as a numbered list.
//
// Every `youtube_video_id` below was verified to exist in the live catalog
// via the Supabase REST API before being added here (title/channel/view
// count checked, not guessed) - see the owner report for the full list with
// sources. Nothing here is invented.
//
// CURATION NOTE for whoever edits this next: the catalog's coverage of pure
// "beginner explainer" content is thinner than its coverage of festival
// footage and Hindi-language talks - a few of the ten below are the best
// AVAILABLE fit rather than an ideal purpose-made video (step 2 especially:
// there's no short "who is Prabhupada / what is ISKCON" explainer in the
// catalog today, only a tribute talk). Swap in something better the moment
// a purpose-made English beginner video syncs in - don't treat this list as
// permanent.
export type NewcomerStep = {
  step: number;
  /** The question this step answers - shown as the step's heading. */
  title: string;
  /** One warm sentence: why this is the right next thing to watch. */
  why: string;
  youtube_video_id: string;
};

export const NEWCOMER_PATH: NewcomerStep[] = [
  {
    step: 1,
    title: "Who is Kṛṣṇa?",
    why: "The most natural first question, answered gently by a monk who was once asked exactly this by a university student in Hong Kong.",
    youtube_video_id: "B75Z3s--NlQ",
  },
  {
    step: 2,
    title: "Who was Śrīla Prabhupāda, and what is ISKCON?",
    why: "The elderly monk who carried this entire tradition across the ocean at 69 and started a single storefront temple - meet the founder before meeting his movement.",
    youtube_video_id: "SsU9bqlsUus",
  },
  {
    step: 3,
    title: "What is the mahā-mantra, and how do I chant it?",
    why: "Sixteen words, chanted for five thousand years - here is exactly how to begin saying them yourself.",
    youtube_video_id: "k88AYVC-QDQ",
  },
  {
    step: 4,
    title: "What is the Bhagavad-gītā?",
    why: "Before opening the book itself, hear in plain words what it actually is and why it has mattered for millennia.",
    youtube_video_id: "-ypPHOF80L0",
  },
  {
    step: 5,
    title: "What does the Gītā actually teach?",
    why: "A short, direct answer to why this one text, out of everything ever written, is worth reading first.",
    youtube_video_id: "-WVwsBoWcc0",
  },
  {
    step: 6,
    title: "What does a kirtan feel like?",
    why: "Reading about chanting only goes so far - watch a room full of ordinary people lost in it together.",
    youtube_video_id: "PKu8P3KQi9I",
  },
  {
    step: 7,
    title: "What is prasādam, and why does it matter?",
    why: "Food offered to Kṛṣṇa isn't a side note in this tradition - it's one of its simplest, most daily practices.",
    youtube_video_id: "Abls3YtlWQE",
  },
  {
    step: 8,
    title: "Am I this body, or something more?",
    why: "The question underneath every other question on this list, answered simply in under three minutes.",
    youtube_video_id: "gv3DJt75hpA",
  },
  {
    step: 9,
    title: "What does visiting a temple feel like?",
    why: "A glimpse of an actual darshan at one of the tradition's most sacred temples, for whenever you're ready to go in person.",
    youtube_video_id: "Nf390Do3BuY",
  },
  {
    step: 10,
    title: "Where do I go from here?",
    why: "One devotee's own account of how a child's curiosity turned into a lifelong path - a fitting close before you continue on your own.",
    youtube_video_id: "vF_A_TcAgtM",
  },
];
