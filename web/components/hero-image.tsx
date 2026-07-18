"use client"; // tracks whether the high-res thumbnail failed, which needs
// browser-side state (see the fallback logic below) - the rest of Hero
// stays a server component.

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

// Full-bleed hero art (DESIGN.md #4: "highest available resolution
// maxresdefault.jpg... with client-side fallback to hqdefault.jpg - never
// render a 480px image full-bleed"). `maxresdefault` (1280px) doesn't exist
// for every video, and YouTube's CDN has a surprising quirk when it's
// missing: instead of a clean 404, it can respond 200 OK with a tiny
// 120x90 grey placeholder image. A plain `onError` handler only catches the
// true-404 case, so we also inspect the *loaded* image's natural width -
// every real maxresdefault is far wider than 120px, so anything at or
// below that must be the placeholder. Either signal flips us to
// `hqdefault.jpg` (480px), which YouTube serves reliably for public videos.
export function HeroImage({
  videoId,
  alt,
  priority = false,
  className,
}: {
  videoId: string;
  alt: string;
  /** Only the active/first carousel slide should be priority (the LCP
   * image); the rest lazy-load so they don't compete for bandwidth. */
  priority?: boolean;
  /** Extra classes on the image itself - the carousel passes the Ken Burns
   * animation class here for the active slide. */
  className?: string;
}) {
  const [fellBack, setFellBack] = useState(false);

  const src = fellBack
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="100vw"
      // The hero artwork renders at 34% opacity under a heavy scrim
      // (globals.css .hero-media) - quality 50 is visually identical there
      // and meaningfully shrinks the LCP payload on mobile.
      quality={50}
      // Ambient motion is the carousel's slow Ken Burns (passed via
      // `className` on the active slide), so no hover scale here.
      className={cn("object-cover", className)}
      onError={() => setFellBack(true)}
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth <= 120) setFellBack(true);
      }}
    />
  );
}
