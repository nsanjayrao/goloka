import Link from "next/link";

// Shared shelf/section heading so every row wears the same typography and
// rhythm (DESIGN.md #3 hierarchy: section title 34px desktop / 26px mobile
// Fraunces) - one place, no drift. Optional "View all" link uses the deep
// gold on hover (small gold text must clear AA - DESIGN.md #2).
export function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-heading text-[26px] font-medium tracking-tight text-text sm:text-[34px]">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm text-text-muted transition-colors hover:text-accent-strong"
        >
          View all →
        </Link>
      )}
    </div>
  );
}
