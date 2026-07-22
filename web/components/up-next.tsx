"use client"; // the auto-continue preference, the ended state, and the
// countdown are all runtime, visitor-local state.

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LiteEmbed } from "@/components/lite-embed";
import { Link, useRouter } from "@/i18n/navigation";
import { setAutoplay, useAutoplay } from "@/lib/autoplay";

// How long the "Up next" card breathes before moving on - long enough to
// decline calmly, short enough that a listening devotee with eyes closed
// isn't stranded between lectures.
const UP_NEXT_SECONDS = 8;

/** The one light object the server page passes down - just enough to show
 * the card and navigate. */
export type UpNextVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
};

// The watch page's player plus the opt-in "continue to the next video"
// moment (the plan's P1-1). Wraps LiteEmbed rather than replacing it:
// - The toggle (OFF by default, localStorage - lib/autoplay.ts) is the only
//   thing rendered for visitors who never opt in; they ship no API script.
// - Opted in, the embed carries enablejsapi and when the standard player
//   fires ENDED, a card appears BELOW the player (never over it - YouTube's
//   own end screen stays untouched): the next video, a plain-text countdown
//   (no animated bar - a number reading down is calm and needs no
//   reduced-motion special case), and a focused "Stay here" button.
// - On zero it navigates to /watch/<next>?continue=1; the next page reads
//   the param CLIENT-side only (never reflected into markup) and starts its
//   player, still gated on the same opt-in - a shared ?continue link does
//   nothing for someone who never chose this.
export function UpNext({
  videoId,
  title,
  next,
}: {
  videoId: string;
  title: string;
  next: UpNextVideo | null;
}) {
  const autoplayOn = useAutoplay();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("watchPage");
  const [ended, setEnded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(UP_NEXT_SECONDS);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // useAutoplay is false on the server and the FIRST client render (its
  // server snapshot), so everything it gates - the jsApi embed, the
  // ?continue auto-start - appears only after hydration. No mismatch by
  // construction.
  const wireApi = autoplayOn && next !== null;
  const autoStart = autoplayOn && searchParams.get("continue") === "1";

  // The countdown: one tick per second while the card shows. The reset to
  // UP_NEXT_SECONDS happens in handleEnded (the event), so this effect only
  // ever ticks - no synchronous setState inside an effect body.
  useEffect(() => {
    if (!ended) return;
    const intervalId = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(intervalId);
  }, [ended]);

  // Zero → move on. Navigation unmounts this component (route change), so
  // no state needs clearing here; `ended` guards a stale run after cancel.
  useEffect(() => {
    if (!ended || !next) return;
    if (secondsLeft <= 0) router.push(`/watch/${next.id}?continue=1`);
  }, [secondsLeft, ended, next, router]);

  function handleEnded() {
    setSecondsLeft(UP_NEXT_SECONDS);
    setEnded(true);
  }

  // The card is a moment of decision - put the keyboard on "Stay here" so
  // declining is one keypress, never a hunt.
  useEffect(() => {
    if (ended) cancelRef.current?.focus();
  }, [ended]);

  return (
    <div>
      <LiteEmbed
        videoId={videoId}
        title={title}
        jsApi={wireApi}
        autoplay={autoStart}
        onEnded={handleEnded}
      />

      {/* The opt-in switch, quiet under the player - same switch idiom as
          the chant page's preferences. */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          role="switch"
          aria-checked={autoplayOn}
          aria-label={t("upNextToggleAria")}
          onClick={() => setAutoplay(!autoplayOn)}
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
        >
          <span
            className={`inline-block h-[9px] w-[9px] rounded-full border border-hairline transition-colors ${autoplayOn ? "bg-marigold" : "bg-transparent"}`}
            aria-hidden="true"
          />
          {t("upNextToggle")}
        </button>
      </div>

      {ended && autoplayOn && next && (
        <div
          aria-live="polite"
          className="mt-4 flex items-center gap-4 rounded-2xl border border-hairline bg-shyama p-4"
        >
          <Link
            href={`/watch/${next.id}?continue=1`}
            className="relative block aspect-video w-36 shrink-0 overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-flame"
          >
            <Image
              src={next.thumbnailUrl ?? `https://i.ytimg.com/vi/${next.id}/mqdefault.jpg`}
              alt=""
              fill
              sizes="144px"
              className="object-cover"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-marigold">{t("upNextKicker")}</p>
            <p className="mt-1 line-clamp-2 font-heading text-[15px] leading-snug text-text">
              {next.title}
            </p>
            <p className="mt-1 text-[12px] text-text-muted">
              {t("upNextContinuing", { seconds: Math.max(0, secondsLeft) })}
            </p>
          </div>
          <button
            ref={cancelRef}
            type="button"
            onClick={() => setEnded(false)}
            className="shrink-0 rounded-full border border-hairline px-4 py-2 text-[12px] uppercase tracking-[0.14em] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
          >
            {t("upNextCancel")}
          </button>
        </div>
      )}
    </div>
  );
}
