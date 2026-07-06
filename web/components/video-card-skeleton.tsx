import { Skeleton } from "@/components/ui/skeleton";

// Same dimensions as VideoCard, block for block, so swapping skeleton <->
// real card causes zero layout shift (DESIGN.md #5): 18px-radius thumbnail,
// then mt-3 + a 16px title line + a 13px meta line.
export function VideoCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video w-full rounded-card" />
      <div className="mt-3">
        <Skeleton className="h-[16px] w-3/4" />
        <Skeleton className="mt-1 h-[13px] w-1/2" />
      </div>
    </div>
  );
}
