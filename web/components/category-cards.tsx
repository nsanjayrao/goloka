import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SectionHeader } from "@/components/section-header";
import { Link } from "@/i18n/navigation";

// The custom gold line icons, copied EXACTLY from the prototype (DESIGN.md
// #5.8): scripture, diya, mridanga, ॐ set in Marcellus, peacock feather,
// prasadam bowl. Never emoji, never an icon library. A category without a
// mapping falls back to the ॐ.
export const CATEGORY_ICONS: Record<string, ReactNode> = {
  Lectures: (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <path d="M17 8c-3-2.6-7.5-3-12-2v20c4.5-1 9-.6 12 2 3-2.6 7.5-3 12-2V6c-4.5-1-9-.6-12 2z" />
      <path d="M17 8v20" />
    </svg>
  ),
  Festivals: (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <path d="M17 5c2.4 3 2.4 5.6 0 8-2.4-2.4-2.4-5 0-8z" />
      <path d="M7 18h20l-2.5 6.5c-.5 1.5-2 2.5-3.5 2.5h-8c-1.5 0-3-1-3.5-2.5L7 18z" />
      <path d="M13 18v-2m8 2v-2" />
    </svg>
  ),
  "Kirtans & Bhajans": (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <ellipse cx="10" cy="17" rx="4" ry="7" />
      <ellipse cx="24" cy="17" rx="4" ry="7" />
      <path d="M10 10h14M10 24h14" />
    </svg>
  ),
  Kids: (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <path d="M17 29V13" />
      <path d="M17 13c-6 0-9-4-8-9 5 0 8 3 8 9zm0 0c6 0 9-4 8-9-5 0-8 3-8 9z" />
      <circle cx="17" cy="9" r="2.4" />
    </svg>
  ),
  "Prasadam & Cooking": (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <path d="M6 17h22c0 6-5 10-11 10S6 23 6 17z" />
      <path d="M13 12c-1.5-2 1.5-3 0-5m5 5c-1.5-2 1.5-3 0-5m5 5c-1.5-2 1.5-3 0-5" />
    </svg>
  ),
  // Film-strip, drawn in the same 1.4-stroke line style as the prototype set.
  Documentaries: (
    <svg viewBox="0 0 34 34" aria-hidden="true">
      <rect x="5" y="9" width="24" height="16" rx="2" />
      <path d="M10 9v16M24 9v16M5 14h5M5 20h5M24 14h5M24 20h5" />
    </svg>
  ),
};

export const OM_ICON = <span className="om">ॐ</span>;

// Category NAMES and their blurbs are database-driven English values (the
// canonical list lives in worker/sync.py) - a known i18n limitation (i18n
// plan goal #4): translating them would mean either a hardcoded name->key
// mapping that drifts from the worker's source of truth, or translating raw
// DB content, neither of which this pass takes on. They render as-is in
// every locale.
export const CATEGORY_BLURBS: Record<string, string> = {
  Lectures: "Wisdom from the scriptures",
  Festivals: "Sacred celebrations and pastimes",
  "Kirtans & Bhajans": "Soulful melodies that uplift",
  General: "Talks, teachings and more",
  Kids: "For our youngest devotees",
  "Prasadam & Cooking": "Sanctified food and recipes",
  Documentaries: "Lives, places and history of the movement",
};

// "Browse by category" (DESIGN.md #5.8): the real categories from the
// database (never hardcoded - the canonical list lives in worker/sync.py),
// each with its gold line icon. Cells never go under 200px and text wraps
// fully (#8.1) - both enforced in globals.css .cats/.cat.
export function CategoryCards({ categories }: { categories: string[] }) {
  const t = useTranslations("categoryCards");
  if (categories.length === 0) return null;

  return (
    <section className="home-section cv">
      <SectionHeader kicker={t("kicker")} title={t("title")} />
      <div className="cats">
        {categories.map((category) => (
          <Link key={category} href={`/browse/${encodeURIComponent(category)}`} className="cat">
            <span className="icon">{CATEGORY_ICONS[category] ?? OM_ICON}</span>
            <h3>{category}</h3>
            <p>{CATEGORY_BLURBS[category] ?? "Talks, teachings and more"}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
