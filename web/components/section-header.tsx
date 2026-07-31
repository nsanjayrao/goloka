import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

// Shared section heading (DESIGN.md #4): optional small uppercase kicker on
// its OWN line above the Marcellus title (#8.2 - never beside it), the gold
// ❋ mark, and a "View all →" baseline-aligned on the right. `title`/`kicker`
// are already-translated strings from the caller (page copy vs. dynamic
// category/topic names need different treatment, so this component itself
// stays presentation-only).
export function SectionHeader({
  title,
  kicker,
  href,
}: {
  title: string;
  kicker?: string;
  href?: string;
}) {
  const t = useTranslations("sectionHeader");
  return (
    <div className="section-head">
      {/* The kicker is a SIBLING of the row, not a child of the <h2>. Inside
          the heading it made the h2's first baseline its own, so "View all →"
          aligned to the kicker instead of the title - and it became part of
          the heading's accessible name. */}
      {kicker && <span className="kicker">{kicker}</span>}
      <div className="section-head-row">
        <h2>
          <span className="mark" aria-hidden="true">
            ❋
          </span>
          {title}
        </h2>
        {href && (
          <Link href={href} className="view-all">
            {t("viewAll")}
          </Link>
        )}
      </div>
    </div>
  );
}
