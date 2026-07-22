"use client"; // reads the data-saver preference and holds "has this
// visitor tapped play yet" - both are runtime, browser-only state.

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
//
// UP-NEXT WIRING (see components/up-next.tsx): when `jsApi` is true the
// iframe carries enablejsapi=1 and the OFFICIAL IFrame Player API script is
// lazy-loaded to watch for the player's ENDED state - the documented,
// ToS-clean way to know a standard player finished (the embed itself stays
// standard and unmodified; nothing is drawn over it). `jsApi` is only ever
// true after the visitor's explicit opt-in (lib/autoplay.ts is false on the
// server and the first client render), so visitors who never opt in ship
// ZERO extra JS and no youtube.com script.

// One API script per page, however many embeds ask for it.
type YtNamespace = {
  Player: new (
    el: HTMLIFrameElement,
    opts: { events: { onStateChange?: (e: { data: number }) => void } }
  ) => { destroy: () => void };
  PlayerState: { ENDED: number };
};
let ytApiPromise: Promise<YtNamespace> | null = null;
function loadYouTubeIframeApi(): Promise<YtNamespace> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const w = window as unknown as { YT?: YtNamespace; onYouTubeIframeAPIReady?: () => void };
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(w.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

export function LiteEmbed({
  videoId,
  title,
  jsApi = false,
  autoplay = false,
  onEnded,
}: {
  videoId: string;
  title: string;
  /** Attach the IFrame Player API to hear the ENDED event. Only ever passed
   * true client-side, after the autoplay opt-in - see the banner. */
  jsApi?: boolean;
  /** Start playing on mount (the ?continue=1 hand-off from up-next). Only
   * ever true client-side, gated on the same opt-in. */
  autoplay?: boolean;
  onEnded?: () => void;
}) {
  const dataSaver = useDataSaver();
  const [activated, setActivated] = useState(false);
  const t = useTranslations("liteEmbed");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // The player object lives for minutes; the callback prop is re-created
  // every render - the ref keeps the API listener reading the latest one
  // (same idiom as chant-space.tsx's advanceBeadsRef).
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  const showIframe = !dataSaver || activated;

  const params = new URLSearchParams();
  if (activated || autoplay) params.set("autoplay", "1");
  if (jsApi && typeof window !== "undefined") {
    params.set("enablejsapi", "1");
    // The API's recommended origin check - messages only ever go to/from
    // this site.
    params.set("origin", window.location.origin);
  }
  const query = params.toString();
  const src = `https://www.youtube-nocookie.com/embed/${videoId}${query ? `?${query}` : ""}`;

  useEffect(() => {
    if (!jsApi || !showIframe) return;
    let cancelled = false;
    let player: { destroy: () => void } | null = null;
    void loadYouTubeIframeApi().then((yt) => {
      if (cancelled || !iframeRef.current) return;
      player = new yt.Player(iframeRef.current, {
        events: {
          onStateChange: (e) => {
            if (e.data === yt.PlayerState.ENDED) onEndedRef.current?.();
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        player?.destroy();
      } catch {
        // A player mid-teardown while the iframe unmounts - nothing to do.
      }
    };
  }, [jsApi, showIframe, videoId]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl shadow-2xl">
      {showIframe ? (
        <iframe
          ref={iframeRef}
          src={src}
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
