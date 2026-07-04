"use client"; // tracks whether the high-res thumbnail failed, which needs
// browser-side state (see the fallback logic below) - the rest of Hero
// stays a server component.

import Image from "next/image";
import { useState } from "react";

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
}: {
  videoId: string;
  alt: string;
  /** Only the active/first carousel slide should be priority (the LCP
   * image); the rest lazy-load so they don't compete for bandwidth. */
  priority?: boolean;
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
      className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
      onError={() => setFellBack(true)}
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth <= 120) setFellBack(true);
      }}
    />
  );
}
