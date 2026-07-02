import { Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { Video } from "@/lib/types";

// Home page hero built from the latest video (DESIGN.md #4). We request
// "hqdefault" directly from YouTube's thumbnail CDN rather than the
// `thumbnail_url` column (which the worker stores at "medium"/320px res -
// too soft blown up full-bleed). hqdefault (480px) exists for effectively
// every public video, so no fallback logic is needed.
export function Hero({ video }: { video: Video }) {
  const heroImage = `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`;

  return (
    <Link
      href={`/watch/${video.youtube_video_id}`}
      className="group relative block h-[40vh] min-h-[280px] w-full overflow-hidden sm:h-[60vh]"
    >
      <Image
        src={heroImage}
        alt={video.title}
        fill
        priority
        sizes="100vw"
        className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-4 sm:p-12">
        <span className="rounded-full border border-accent/60 bg-bg/40 px-3 py-1 text-[13px] text-accent">
          {video.category}
        </span>
        <h1 className="font-heading text-2xl font-medium leading-tight text-text sm:text-4xl sm:leading-tight max-w-2xl">
          {video.title}
        </h1>
        <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform duration-200 ease-out group-hover:scale-[1.02]">
          <Play className="size-4 fill-current" />
          Watch now
        </span>
      </div>
    </Link>
  );
}
