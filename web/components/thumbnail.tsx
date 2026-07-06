"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

// Thin client wrapper around next/image that fades the thumbnail in when it
// finishes loading (DESIGN.md #4 card / #5 motion): the warm placeholder
// behind it shows first, then the image resolves in over 300ms - no jarring
// pop, zero layout shift. Kept as its own tiny client boundary so VideoCard
// (and a grid of hundreds of them) stays a server component.
export function Thumbnail({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  // Callback ref: an already-cached image reports `complete` synchronously on
  // mount, so it never gets stuck invisible waiting for an onLoad that already
  // fired. Fresh images fall through to onLoad. (Ref callback, not useEffect -
  // avoids the set-state-in-effect rule.)
  const markIfComplete = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setLoaded(true);
  }, []);

  return (
    <Image
      ref={markIfComplete}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onLoad={() => setLoaded(true)}
      className={cn(
        "object-cover transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
