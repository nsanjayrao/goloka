"use client"; // reads the data-saver preference and holds "has this
// visitor tapped play yet" - both are runtime, browser-only state.

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

import { useDataSaver } from "@/lib/data-saver";

// The watch page's player, click-to-play in data-saver mode (DESIGN.md
// "Watch page"). The standard YouTube embed ships over a megabyte of
// player JS the instant the iframe mounts, whether or not the visitor
// presses play - on a small data pack that's real money for a page they
// might not even watch. When data-saver is on, this renders a facade
// instead: the video's own thumbnail plus the site's marigold play button
// and a "Tap to load player" hint, in the exact same aspect-video box the
// iframe uses (so switching data-saver on/off, or tapping to load, causes
// no layout shift). Tapping swaps in the real youtube-nocookie iframe with
// autoplay=1, since a tap IS the play intent. When data-saver is off (the
// default), the iframe renders immediately - identical to before this
// existed.
export function LiteEmbed({ videoId, title }: { videoId: string; title: string }) {
  const dataSaver = useDataSaver();
  const [activated, setActivated] = useState(false);
  const t = useTranslations("liteEmbed");

  const showIframe = !dataSaver || activated;

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl shadow-2xl">
      {showIframe ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}${activated ? "?autoplay=1" : ""}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActivated(true)}
          aria-label={t("tapToLoadAria", { title })}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          <Image
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            quality={35}
            className="object-cover"
          />
          <span className="absolute inset-0 bg-midnight/45" aria-hidden="true" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-full bg-marigold shadow-[0_8px_28px_rgba(232,163,61,0.5)] transition-transform duration-300 ease-[cubic-bezier(.2,.7,.3,1.4)] group-hover:scale-110 sm:size-16"
            >
              <svg viewBox="0 0 16 16" className="ml-0.5 size-5 fill-midnight sm:size-6">
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            </span>
            <span className="rounded-full bg-midnight/85 px-3 py-1 text-[13px] font-medium tracking-wide text-chandan backdrop-blur-sm">
              {t("tapToLoad")}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
