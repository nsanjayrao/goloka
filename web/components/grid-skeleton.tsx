import { Container } from "@/components/container";

// The shared instant shell for every grid page (/browse/[category],
// /search, /channel/[handle], /topic/[slug]): a header ghost and a grid of
// card ghosts in the SAME responsive columns as components/video-grid.tsx,
// so the skeleton's geometry matches what replaces it (no layout jump).
// Shyama surfaces per DESIGN.md #6; server component, no data, no JS.
export function GridSkeleton({ cards = 10 }: { cards?: number }) {
  return (
    <Container className="page-top pb-12">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton mt-3 h-9 w-64 max-w-full" />
      <div className="mt-10 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-video w-full" />
            <div className="skeleton mt-3 h-4 w-11/12" />
            <div className="skeleton mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </Container>
  );
}
