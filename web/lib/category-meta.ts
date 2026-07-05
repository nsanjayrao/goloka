// One-line "personality" subtitle per category (DESIGN.md #6), shown on the
// home browse posters and the category-page banner.
//
// IMPORTANT: this only DECORATES category names it recognizes — it does NOT
// define the category list (that stays dynamic, from the DB via
// distinct_categories()). A category with no entry here just renders without
// a subtitle, so the never-hardcode-the-list rule is preserved. Keyed by the
// exact category string the worker writes.
//
// OWNER: edit these lines freely; add a row when a new category appears.
const SUBTITLES: Record<string, string> = {
  Lectures: "Wisdom from the scriptures",
  "Kirtans & Bhajans": "Soulful melodies that uplift",
  Festivals: "Sacred celebrations and pastimes",
  Documentaries: "Inspiring true stories",
  Kids: "For our youngest devotees",
  "Prasadam & Cooking": "Sanctified food and recipes",
  General: "Talks, teachings and more",
};

export function categorySubtitle(category: string): string | undefined {
  return SUBTITLES[category];
}
