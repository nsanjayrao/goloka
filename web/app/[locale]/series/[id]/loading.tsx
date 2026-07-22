import { Container } from "@/components/container";

// Instant shell for /series/[id]: header ghost + a column of episode-row
// ghosts mirroring the real list's geometry. Shyama surfaces per
// DESIGN.md #6; server component, no data, no JS.
export default function SeriesLoading() {
  return (
    <Container className="page-top pb-16">
      <div className="mx-auto max-w-3xl">
        <div className="skeleton h-4 w-16" />
        <div className="skeleton mt-3 h-9 w-80 max-w-full" />
        <div className="skeleton mt-4 h-4 w-48" />
        <div className="mt-8 flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton aspect-video w-32 sm:w-40" />
              <div className="flex-1">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton mt-2 h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
