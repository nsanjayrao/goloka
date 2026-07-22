import { GridSkeleton } from "@/components/grid-skeleton";

// Instant shell while this route's data loads - see
// components/grid-skeleton.tsx for shape and rationale.
export default function Loading() {
  return <GridSkeleton />;
}
