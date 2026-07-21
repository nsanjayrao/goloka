"use client"; // the bead-by-bead tap, the mala ring, the sound toggle, and
// "rounds today" are all runtime, visitor-local state - nothing here is
// server data (see lib/rounds.ts).

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useDataSaver } from "@/lib/data-saver";
import { incrementRound, resetToday, useRoundsToday } from "@/lib/rounds";
// Type-only import - erased at compile time, so referencing these types
// here does NOT pull the voice pipeline (or Transformers.js) into this
// component's bundle. The actual module is loaded with a dynamic import()
// inside handleVoiceToggle, only once a devotee opts in - see that
// function and lib/voice-japa.ts's file banner.
import type { VoiceJapaErrorReason, VoiceJapaHandle, VoiceJapaStatus } from "@/lib/voice-japa";

const BEADS_PER_ROUND = 108;
const BLOOM_MS = 1500;
const RING_RESET_MS = 850;
const RESET_CONFIRM_WINDOW_MS = 3000;

const SOUND_KEY = "goloka:chant-sound";

// A visitor preference (does a completed round play a soft tone?), stored
// the same way as everything else on this page - on-device only, nothing
// sent anywhere. Kept local to this file rather than lib/data-saver.ts
// because it's specific to this one page, not a site-wide setting. Same
// useSyncExternalStore idiom as data-saver.ts/rounds.ts, so reading it
// after mount never needs an effect+setState (which the codebase avoids -
// see push-toggle.tsx).
const soundListeners = new Set<() => void>();
function emitSoundChange() {
  for (const listener of soundListeners) listener();
}
function subscribeSound(callback: () => void): () => void {
  soundListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    soundListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}
function getSoundSnapshot(): string {
  try {
    return localStorage.getItem(SOUND_KEY) === "1" ? "1" : "0";
  } catch {
    return "0";
  }
}
/** SSR has no localStorage - "0" (off) is also the correct default: sound
 * is opt-in only, never autoplaying. */
function getSoundServerSnapshot(): string {
  return "0";
}
function setSoundPreference(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
    emitSoundChange();
  } catch {
    // Storage unavailable/full - the toggle just won't remember itself.
  }
}

/** A single, soft tone - never an autoplaying asset, and only ever fired
 * from inside a real tap (the user gesture browsers require to allow
 * audio). Web Audio only, no audio file to ship. Fails silently: a muted
 * round completes exactly as gracefully as a sounding one. */
function playRoundChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 528; // a warm, gentle bell-like tone
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.9);
    osc.onended = () => void ctx.close();
  } catch {
    // Web Audio unavailable/blocked - the round still completes silently.
  }
}

// The mahā-mantra and its meaning are kept as FIXED text, identical in
// every locale, the same way the footer's mantra line and the AartiPeriod
// period labels already are - this is liturgical Sanskrit, not site copy,
// and it belongs to every devotee the same way regardless of the browser's
// language setting. Only the small interactive chrome around it (rounds
// counter, reset, sound toggle) is translated, via the "pages.chant"
// namespace.
const MANTRA_ROMAN = [
  "Hare Kṛṣṇa Hare Kṛṣṇa, Kṛṣṇa Kṛṣṇa Hare Hare",
  "Hare Rāma Hare Rāma, Rāma Rāma Hare Hare",
];
const MANTRA_DEVANAGARI = ["हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे", "हरे राम हरे राम, राम राम हरे हरे"];

// "off"/"error" are UI-local states this component adds on top of what
// lib/voice-japa.ts itself reports (requesting-mic/loading-model/
// listening) - the pipeline module has no concept of "not started yet" or
// "gave up", since it either is running or has handed control back via a
// callback.
type VoiceUiStatus = "off" | "error" | VoiceJapaStatus;
// transcribe-failed is deliberately excluded - a single bad recording
// window doesn't end the session (see handleVoiceToggle's onError), so it
// never becomes a fatal reason shown in the UI.
type FatalVoiceError = Exclude<VoiceJapaErrorReason, "transcribe-failed">;

const VOICE_ERROR_MESSAGE_KEY: Record<FatalVoiceError, "voiceMicDenied" | "voiceUnsupported" | "voiceModelFailed"> = {
  "mic-denied": "voiceMicDenied",
  unsupported: "voiceUnsupported",
  "model-load-failed": "voiceModelFailed",
};

export function ChantSpace() {
  const t = useTranslations("pages.chant");
  const roundsToday = useRoundsToday();
  const dataSaverOn = useDataSaver();

  // In-progress beads within the CURRENT round only - intentionally not
  // persisted (lib/rounds.ts keeps completed rounds, nothing mid-round). A
  // reload simply starts the present round over; nothing is lost that this
  // page considers worth keeping.
  const [beadIndex, setBeadIndex] = useState(0);
  const [blooming, setBlooming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const soundOn = useSyncExternalStore(subscribeSound, getSoundSnapshot, getSoundServerSnapshot) === "1";

  const [voiceStatus, setVoiceStatus] = useState<VoiceUiStatus>("off");
  const [voiceError, setVoiceError] = useState<FatalVoiceError | null>(null);
  const [modelProgress, setModelProgress] = useState(0);

  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceHandleRef = useRef<VoiceJapaHandle | null>(null);
  // Bumped on every toggle-on/toggle-off/unmount so a startVoiceJapa()
  // call that's still requesting the mic or downloading the model when the
  // devotee cancels doesn't come alive afterwards and silently start
  // listening again - see handleVoiceToggle.
  const voiceGenerationRef = useRef(0);

  useEffect(() => {
    return () => {
      if (bloomTimer.current) clearTimeout(bloomTimer.current);
      if (ringTimer.current) clearTimeout(ringTimer.current);
      if (resetArmTimer.current) clearTimeout(resetArmTimer.current);
      voiceGenerationRef.current += 1;
      voiceHandleRef.current?.stop();
    };
  }, []);

  /** Advances by `n` beads in one go, completing as many rounds as that
   * crosses (almost always 0 or 1 - voice mode is the only caller that can
   * ever pass more than 1, when a single recording window happens to catch
   * more than one full mantra - see lib/voice-japa.ts). Reads `beadIndex`
   * from render scope exactly ONCE, which is what makes this safe to call
   * with n > 1: doing the equivalent by calling a "handleTap" repeatedly
   * in a loop would have every call read the same stale value, since plain
   * state reads don't update until the next render. */
  function advanceBeads(n: number) {
    if (n <= 0) return;
    let landingBead = beadIndex + n;
    let completedRounds = 0;
    while (landingBead >= BEADS_PER_ROUND) {
      landingBead -= BEADS_PER_ROUND;
      completedRounds += 1;
    }

    if (completedRounds === 0) {
      setBeadIndex(landingBead);
      return;
    }

    // At least one round completed somewhere in this batch - the same
    // quiet acknowledgment as a single tap landing on the 108th bead:
    // show the ring fully lit, then settle to wherever the batch actually
    // lands (0 if it landed exactly on a round, or partway into the next
    // one) after the same pause.
    for (let i = 0; i < completedRounds; i++) incrementRound();
    if (soundOn) playRoundChime();
    setBlooming(true);
    setAnnouncement(t("roundCompleteAnnounce"));
    setBeadIndex(BEADS_PER_ROUND);

    if (bloomTimer.current) clearTimeout(bloomTimer.current);
    if (ringTimer.current) clearTimeout(ringTimer.current);
    bloomTimer.current = setTimeout(() => setBlooming(false), BLOOM_MS);
    ringTimer.current = setTimeout(() => setBeadIndex(landingBead), RING_RESET_MS);
  }

  function handleTap() {
    advanceBeads(1);
  }

  // A voice session's callbacks (passed to startVoiceJapa once, in
  // handleVoiceToggle) live for the whole time voice mode is on, calling
  // onMantraCompleted every so often as mantras are recognized - unlike a
  // tap, which is a brand new click event each time and always runs the
  // current render's handleTap. Without this ref, onMantraCompleted would
  // keep calling the SAME advanceBeads closure from the moment voice mode
  // was turned on, reading whatever beadIndex was at that instant forever
  // after. Updating the ref in an effect (rather than during render) is
  // safe here specifically because voice completions are seconds apart,
  // never a synchronous burst - by the time one fires, the effect from the
  // previous render has long since run.
  const advanceBeadsRef = useRef(advanceBeads);
  useEffect(() => {
    advanceBeadsRef.current = advanceBeads;
  });

  function handleReset() {
    if (!resetArmed) {
      setResetArmed(true);
      if (resetArmTimer.current) clearTimeout(resetArmTimer.current);
      resetArmTimer.current = setTimeout(() => setResetArmed(false), RESET_CONFIRM_WINDOW_MS);
      return;
    }
    resetToday();
    setResetArmed(false);
    if (resetArmTimer.current) clearTimeout(resetArmTimer.current);
  }

  function handleSoundToggle() {
    setSoundPreference(!soundOn);
  }

  /** Turns hands-free chanting on or off. Every failure mode (denied
   * permission, an unsupported browser, a model that fails to load) is
   * reported through voiceError and simply leaves tap-to-count working -
   * never a broken page. See lib/voice-japa.ts's file banner for the vow
   * this is built on: the mic is only ever read locally, nothing is
   * recorded or sent anywhere, and the model library is dynamically
   * imported here so it never loads for anyone who leaves this off. */
  async function handleVoiceToggle() {
    if (voiceStatus !== "off" && voiceStatus !== "error") {
      voiceGenerationRef.current += 1;
      voiceHandleRef.current?.stop();
      voiceHandleRef.current = null;
      setVoiceStatus("off");
      setVoiceError(null);
      return;
    }

    const generation = ++voiceGenerationRef.current;
    setVoiceError(null);
    setModelProgress(0);

    const { startVoiceJapa } = await import("@/lib/voice-japa");
    const handle = await startVoiceJapa({
      onStatusChange: (status) => {
        if (voiceGenerationRef.current !== generation) return;
        setVoiceStatus(status);
      },
      onModelProgress: (fraction) => {
        if (voiceGenerationRef.current !== generation) return;
        setModelProgress(fraction);
      },
      onMantraCompleted: (n) => {
        if (voiceGenerationRef.current !== generation) return;
        advanceBeadsRef.current(n);
      },
      onError: (reason) => {
        // A single failed recording window doesn't end the session (see
        // voice-japa.ts) - only report the fatal, session-ending reasons.
        if (reason === "transcribe-failed") return;
        if (voiceGenerationRef.current !== generation) return;
        setVoiceStatus("error");
        setVoiceError(reason);
        voiceHandleRef.current = null;
      },
    });

    if (voiceGenerationRef.current !== generation) {
      // Cancelled (toggled off, or the page unmounted) while the mic
      // permission prompt or the model download was still in flight -
      // stop it immediately rather than let a stale session come alive.
      handle.stop();
      return;
    }
    voiceHandleRef.current = handle;
  }

  function handleNudge(delta: number) {
    // A gentle manual correction, not a substitute tap: it adjusts the
    // bead count directly without touching sound/bloom/round-completion,
    // since it's meant to fix a voice miscount by one or two, not to
    // simulate real chanting.
    setBeadIndex((current) => Math.min(BEADS_PER_ROUND, Math.max(0, current + delta)));
  }

  const beads = Array.from({ length: BEADS_PER_ROUND }, (_, i) => i < beadIndex);
  const listening = voiceStatus === "listening";

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <p className="text-[13px] uppercase tracking-[0.24em] text-marigold">Rādhe Rādhe</p>

      <h1 className="chant-mantra font-heading mt-5 text-chandan" lang="sa-Latn">
        {MANTRA_ROMAN.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </h1>

      <p className="chant-devanagari font-heading mt-3 text-chandan" lang="hi" aria-hidden="true">
        {MANTRA_DEVANAGARI.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>

      <p className="mt-6 max-w-md text-[14px] leading-relaxed text-text-muted">
        Not a chant to finish, but a prayer — Rādhārāṇī is the one who gives Kṛṣṇa, and to call
        her name first is how the soul approaches Him. In Śrīla Prabhupāda&rsquo;s sense of it, the
        mahā-mantra is the soul&rsquo;s own call: <em>&ldquo;O Lord, O energy of the Lord, please engage
        me in Your service.&rdquo;</em>
      </p>

      <div className="chant-ring mt-10">
        {beads.map((filled, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`chant-bead${filled ? " is-filled" : ""}`}
            style={{ transform: `rotate(${(i / BEADS_PER_ROUND) * 360}deg) translateY(calc(var(--ring-size) / -2 + 6px))` }}
          />
        ))}
        {/* The hit target fills the whole ring (see globals.css's comment
            on .chant-tap) so an eyes-closed tap never needs aiming - the
            visible "bowl of light" (.chant-bowl) stays its original size
            inside it, purely decorative. */}
        <button
          type="button"
          onClick={handleTap}
          className="chant-tap"
          aria-label={t("tapAria", { count: beadIndex })}
        >
          <span
            aria-hidden="true"
            className={`chant-bowl${blooming ? " is-blooming" : ""}${listening ? " is-listening" : ""}`}
          >
            <span className="font-heading text-3xl text-chandan">{beadIndex}</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">/ 108</span>
          </span>
        </button>
      </div>

      {listening && <p className="mt-4 text-[12px] uppercase tracking-[0.14em] text-marigold">{t("voiceListening")}</p>}

      <div className="mt-8 flex items-center gap-6 text-[12px] uppercase tracking-[0.14em] text-text-muted">
        <span>{t("roundsToday", { count: roundsToday })}</span>
        <button
          type="button"
          onClick={handleReset}
          className="text-text-muted underline-offset-4 outline-none transition-colors hover:text-flame focus-visible:text-flame"
          aria-label={resetArmed ? t("resetConfirmAria") : t("resetAria")}
        >
          {resetArmed ? t("resetConfirm") : t("reset")}
        </button>
      </div>

      {listening && (
        <div className="mt-3 flex items-center gap-5 text-[11px] uppercase tracking-[0.14em] text-text-muted">
          <button
            type="button"
            onClick={() => handleNudge(-1)}
            aria-label={t("voiceNudgeMinusAria")}
            className="outline-none transition-colors hover:text-flame focus-visible:text-flame"
          >
            {t("voiceNudgeMinus")}
          </button>
          <button
            type="button"
            onClick={() => handleNudge(1)}
            aria-label={t("voiceNudgePlusAria")}
            className="outline-none transition-colors hover:text-flame focus-visible:text-flame"
          >
            {t("voiceNudgePlus")}
          </button>
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={soundOn}
        aria-label={t("soundAria")}
        onClick={handleSoundToggle}
        className="mt-4 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
      >
        <span
          className={`inline-block h-[9px] w-[9px] rounded-full border border-hairline transition-colors ${soundOn ? "bg-marigold" : "bg-transparent"}`}
          aria-hidden="true"
        />
        {t("sound")}
      </button>

      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={listening}
          aria-label={t("voiceAria")}
          onClick={handleVoiceToggle}
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
        >
          <span
            className={`inline-block h-[9px] w-[9px] rounded-full border border-hairline transition-colors ${listening ? "bg-marigold" : "bg-transparent"}`}
            aria-hidden="true"
          />
          {t("voiceLabel")}
        </button>

        {voiceStatus === "requesting-mic" && <p className="text-[12px] text-text-muted">{t("voiceRequestingMic")}</p>}

        {voiceStatus === "loading-model" && (
          <div className="flex w-full max-w-[220px] flex-col items-center gap-1.5">
            <p className="text-[12px] text-text-muted">{t("voicePreparingProgress", { percent: Math.round(modelProgress * 100) })}</p>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-shyama-2">
              <div
                className="h-full rounded-full bg-marigold transition-[width] duration-300"
                style={{ width: `${Math.round(modelProgress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {voiceStatus === "error" && voiceError && (
          <p className="max-w-xs text-[12px] text-lotus">{t(VOICE_ERROR_MESSAGE_KEY[voiceError])}</p>
        )}

        {(voiceStatus === "off" || voiceStatus === "error") && dataSaverOn && (
          <p className="max-w-xs text-[11px] text-text-muted">{t("voiceSlowConnectionWarning")}</p>
        )}

        <p className="max-w-xs text-[11px] italic leading-relaxed text-text-muted">{t("voicePrivacy")}</p>
      </div>

      <p className="mt-6 max-w-sm text-[12px] italic leading-relaxed text-text-muted">
        A companion for calling the holy name and counting rounds — offered humbly, not a
        replacement for chanting on tulasī beads.
      </p>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
