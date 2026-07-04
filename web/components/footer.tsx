import { Container } from "@/components/container";
import { LogoMark } from "@/components/icons/logo-mark";

// The footer's own `border-t` is its divider. DESIGN.md #6's lotus SVG
// divider is reserved for empty states (EmptyState renders it) - putting
// one here too would put two lotuses on any empty-state page, breaking the
// "max once per page" rule. The logo lockup is a different element and
// gives the page a signed-off ending (DESIGN.md #6).
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border pb-20 pt-10 sm:pb-10">
      <Container className="flex flex-col items-center gap-4 text-center">
        <span className="flex items-center gap-1.5 font-heading text-lg font-medium tracking-tight text-text">
          <LogoMark className="size-5" />
          Goloka<span className="text-accent">.</span>
        </span>
        <p className="max-w-md text-sm text-text-muted">
          Goloka is an index, not a host — every video plays through the official
          YouTube player and links back to its source channel. All content belongs
          to its creators.
        </p>
      </Container>
    </footer>
  );
}
