"use client"; // reads the data-saver preference and holds "has this
// visitor tapped play yet" - both are runtime, browser-only state.

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

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
// IFRAME API WIRING. When `jsApi` is true the iframe carries enablejsapi=1
// and the OFFICIAL IFrame Player API script is lazy-loaded - the documented,
// ToS-clean way to observe a standard player (the embed itself stays standard
// and unmodified; nothing is drawn over it). It gives us two things: the
// ENDED event that drives up-next, and getCurrentTime() for the resume
// position.
//
// As of 2026-08-01 up-next passes `jsApi` for EVERY watch, not only after the
// autoplay opt-in, because resume needs it. That is affordable precisely
// because of the curtain: the script is fetched inside an effect gated on
// `showIframe`, which is only true after the play tap - so it never touches
// page load, and a devotee who opens a watch page and leaves still downloads
// no youtube.com script at all.

// One API script per page, however many embeds ask for it.
type YtNamespace = {
  Player: new (
    el: HTMLIFrameElement,
    opts: { events: { onStateChange?: (e: { data: number }) => void } }
  ) => { destroy: () => void; getCurrentTime?: () => number };
  PlayerState: { ENDED: number; PLAYING: number };
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
  startAt,
  onProgress,
}: {
  videoId: string;
  title: string;
  /** Attach the IFrame Player API to hear the ENDED event. Only ever passed
   * true client-side, after the autoplay opt-in - see the banner. */
  jsApi?: boolean;
  /** Seconds to resume from. Applied via YouTube's own `start` param, which
   * needs no API - only RECORDING a position does. Frozen at activation (see
   * below) so a late-arriving cross-device position can never reload a video
   * a devotee is already watching. */
  startAt?: number;
  /** Called with the current position every few seconds while playing, and
   * once when the page is hidden. */
  onProgress?: (seconds: number) => void;
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
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onEndedRef.current = onEnded;
    // Same reason as onEnded: the player effect must not re-run (and tear the
    // YouTube player down) merely because the parent re-rendered with a fresh
    // callback identity.
    onProgressRef.current = onProgress;
  });

  // The curtain (2026-07-23). The iframe now waits for intent from EVERY
  // visitor, not only those on data-saver - which is both the cheaper
  // default and the point of the design: nothing plays until a devotee
  // chooses a voice. `autoplay` (the ?continue=1 hand-off from up-next)
  // still skips the facade, and opens the curtain instead.
  const showIframe = activated || autoplay;

  // `revealed` is the curtain being open; `curtainGone` unmounts it so it
  // can never sit above the player once its work is done.
  const [revealed, setRevealed] = useState(false);
  const [curtainGone, setCurtainGone] = useState(false);
  // Set by the iframe's own load event - a good proxy for "the player is up".
  const [playerReady, setPlayerReady] = useState(false);
  const closedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!showIframe || revealed) return;

    // Under reduced motion there is no theatre at all: the panels never
    // render, so there is nothing to wait for. Deferred to a frame callback
    // rather than set synchronously in the effect body (the same idiom the
    // page-load veil used, per react-hooks/set-state-in-effect).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => {
        setRevealed(true);
        setCurtainGone(true);
      });
      return () => cancelAnimationFrame(id);
    }

    // The dwell is deliberate. The iframe is loading behind the closed
    // curtain, so this is not latency being hidden - it is the moment
    // before darshan, which is the part devotees come early for.
    //
    // But it must not be a FIXED wait. At a flat 1150ms a fast connection had
    // the player up in ~400ms and then sat behind cloth for 750ms of nothing,
    // with the audio already playing - which reads as a stuck page, not as
    // anticipation. So: open once the player is ready, but never before a
    // 600ms floor (or the parting is abrupt), and never later than 1150ms
    // (so a slow connection is still covered rather than stranded).
    if (closedAt.current === null) closedAt.current = Date.now();
    const elapsed = Date.now() - closedAt.current;
    const wait = Math.max(0, (playerReady ? 600 : 1150) - elapsed);
    const open = setTimeout(() => setRevealed(true), wait);
    return () => clearTimeout(open);
  }, [showIframe, revealed, playerReady]);

  useEffect(() => {
    if (!revealed || curtainGone) return;
    // Panels glide for 2.1s (globals.css) - drop them right after.
    const remove = setTimeout(() => setCurtainGone(true), 2300);
    return () => clearTimeout(remove);
  }, [revealed, curtainGone]);

  // Pressing "Begin listening" UNMOUNTS the button and mounts the iframe in
  // its place. The focused element therefore disappears and focus falls back
  // to <body>, so a devotee using a keyboard has to tab through the whole
  // header again to reach the player they just opened, and a screen reader
  // silently jumps to the top of the document.
  //
  // Focus moves only once the curtain is GONE, not when the iframe mounts:
  // moving it sooner would park focus on an element completely covered by the
  // silk panels, which is WCAG 2.4.11 (Focus Not Obscured). The iframe carries
  // `inert` until then for the same reason - it cannot be tabbed into while
  // something is drawn over it.
  const takeFocus = useRef(false);
  useEffect(() => {
    if (!takeFocus.current || !curtainGone || !iframeRef.current) return;
    takeFocus.current = false;
    iframeRef.current.focus();
  }, [curtainGone]);

  // The src is memoised so the resume position is FROZEN once the player
  // exists. `startAt` can arrive late - a cross-device position is fetched
  // over the network while the curtain is still closed - and if it changed
  // after the iframe mounted, the src would change and RELOAD a video the
  // devotee is already watching, throwing them back to the resume point
  // forever. Omitting it from the deps is the entire mechanism, not an
  // oversight: this recomputes when the player appears and never again.
  const src = useMemo(() => {
    const params = new URLSearchParams();
    if (activated || autoplay) params.set("autoplay", "1");
    if (startAt != null && startAt > 0) {
      // YouTube's own parameter - resuming needs no API, only recording does.
      params.set("start", String(Math.floor(startAt)));
    }
    if (jsApi && typeof window !== "undefined") {
      params.set("enablejsapi", "1");
      // The API's recommended origin check - messages only ever go to/from
      // this site.
      params.set("origin", window.location.origin);
    }
    const query = params.toString();
    return `https://www.youtube-nocookie.com/embed/${videoId}${query ? `?${query}` : ""}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, showIframe, activated, autoplay, jsApi]);

  useEffect(() => {
    if (!jsApi || !showIframe) return;
    let cancelled = false;
    let player: { destroy: () => void; getCurrentTime?: () => number } | null = null;
    let poll = 0;

    // Every 10s while playing. Frequent enough that closing a tab mid-lecture
    // loses at most ten seconds, rare enough that it is nowhere near the
    // per-frame work the motion audit cares about. The position is also
    // captured on pagehide, which is the case that actually matters: a devotee
    // closing the tab or switching apps mid-lecture.
    const report = () => {
      const at = player?.getCurrentTime?.();
      if (typeof at === "number" && at > 0) onProgressRef.current?.(at);
    };
    const onHide = () => report();

    void loadYouTubeIframeApi().then((yt) => {
      if (cancelled || !iframeRef.current) return;
      player = new yt.Player(iframeRef.current, {
        events: {
          onStateChange: (e) => {
            if (e.data === yt.PlayerState.ENDED) {
              onEndedRef.current?.();
              // A finished lecture must not resume one second from the end.
              onProgressRef.current?.(0);
            }
            if (e.data === yt.PlayerState.PLAYING && !poll) {
              poll = window.setInterval(report, 10_000);
            }
          },
        },
      });
      window.addEventListener("pagehide", onHide);
    });

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("pagehide", onHide);
      // One last read on the way out - navigating away inside the app (an
      // up-next hand-off, a tap on a related video) never fires pagehide.
      report();
      try {
        player?.destroy();
      } catch {
        // A player mid-teardown while the iframe unmounts - nothing to do.
      }
    };
  }, [jsApi, showIframe, videoId]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl shadow-2xl">
      {/* The curtain sits ABOVE the embed and never touches it - the
          YouTube player itself stays standard and unmodified (ToS), exactly
          as the tap-to-load facade already did. It is removed from the DOM
          the moment it has finished parting. */}
      {showIframe && !curtainGone && (
        <div className={revealed ? "darshan open" : "darshan"} aria-hidden="true">
          <div className="panel l" />
          <div className="panel r" />
          <div className="seam" />
          <p className="waiting">{t("curtain")}</p>
        </div>
      )}

      {showIframe ? (
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          inert={!curtainGone}
          onLoad={() => setPlayerReady(true)}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            takeFocus.current = true;
            setActivated(true);
          }}
          aria-label={t("tapToLoadAria", { title })}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          <Image
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            quality={dataSaver ? 25 : 45}
            className="object-cover"
          />
          <span className="absolute inset-0 bg-scrim/55" aria-hidden="true" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {/* The play mark no longer pops. Its old easing overshot past
                its target, which is the one thing the motion vocabulary
                forbids outright - grace does not rebound. */}
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-full bg-marigold shadow-[0_8px_28px_rgb(var(--glow-rgb)/0.5)] transition-transform duration-300 ease-spring group-hover:scale-105 sm:size-16"
            >
              <svg viewBox="0 0 16 16" className="ml-0.5 size-5 fill-accent-ink sm:size-6">
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            </span>
            <span className="rounded-full bg-scrim/85 px-3 py-1 text-[13px] font-medium tracking-wide text-chandan backdrop-blur-sm">
              {t("beginListening")}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
