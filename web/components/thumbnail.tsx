"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

import { useDataSaver } from "@/lib/data-saver";
import { cn } from "@/lib/utils";

// In data-saver mode we deliberately ask the CDN for a smaller image than
// the box actually needs - scaling every "Nvw" chunk in the caller's
// `sizes` string down by 40%. object-cover fills the same box regardless,
// so this costs no layout shift, just a softer image on top of the
// quality=35 encode below. Falls back to any non-vw segment untouched.
function shrinkSizes(sizes: string): string {
  return sizes.replace(/(\d+(?:\.\d+)?)vw/g, (_, n: string) => `${Math.round(parseFloat(n) * 0.6)}vw`);
}

// Thin client wrapper around next/image that fades the thumbnail in when it
// finishes loading (DESIGN.md #4 card / #5 motion): the warm placeholder
// behind it shows first, then the image resolves in over 300ms - no jarring
// pop, zero layout shift. Kept as its own tiny client boundary so VideoCard
// (and a grid of hundreds of them) stays a server component.
//
// It's also the client island that reads the data-saver preference for
// every thumbnail on the site: a smaller `sizes` request plus quality=35
// when it's on, the exact current behaviour when it's off.
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
  const dataSaver = useDataSaver();

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
      sizes={dataSaver ? shrinkSizes(sizes) : sizes}
      quality={dataSaver ? 35 : undefined}
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
