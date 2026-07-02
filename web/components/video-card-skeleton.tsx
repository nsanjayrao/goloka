import { Skeleton } from "@/components/ui/skeleton";

// Same dimensions as VideoCard, block for block, so swapping skeleton <->
// real card causes zero layout shift (DESIGN.md #5).
export function VideoCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-[15px] w-full" />
        <Skeleton className="h-[15px] w-3/4" />
        <Skeleton className="h-[13px] w-1/2" />
      </div>
    </div>
  );
}
