import { Container } from "@/components/container";

// Instant shell for /watch/[id] while the video row is fetched - the same
// stage shape as the real page (player, title, meta, a row of cards), in
// shyama surfaces (DESIGN.md #6: never a white flash, never a frozen
// screen). Server component, no data, no client JS.
export default function WatchLoading() {
  return (
    <Container className="page-top pb-8 sm:pb-10">
      <div className="mx-auto max-w-4xl">
        <div className="skeleton aspect-video w-full" />
        <div className="skeleton mt-6 h-8 w-3/4" />
        <div className="skeleton mt-3 h-4 w-1/3" />
      </div>
      <div className="mx-auto mt-12 max-w-4xl">
        <div className="skeleton h-5 w-44" />
        <div className="mt-4 flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="w-64 shrink-0">
              <div className="skeleton aspect-video w-full" />
              <div className="skeleton mt-2 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
