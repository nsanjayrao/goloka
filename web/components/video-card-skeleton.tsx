import { Skeleton } from "@/components/ui/skeleton";

// Same dimensions as VideoCard, block for block, so swapping skeleton <->
// real card causes zero layout shift (DESIGN.md #5).
export function VideoCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video w-full rounded-xl" />
      {/* Mirrors VideoCard's text block exactly: one 15px title line
          (line-clamp-1) + one 13px meta line, mt-2 / mt-1 spacing - so
          swapping skeleton <-> card causes zero layout shift. */}
      <div className="mt-2">
        <Skeleton className="h-[15px] w-3/4" />
        <Skeleton className="mt-1 h-[13px] w-1/2" />
      </div>
    </div>
  );
}
