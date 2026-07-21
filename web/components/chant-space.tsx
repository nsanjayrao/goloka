"use client"; // the bead-by-bead tap, the mala ring, the sound toggle, the
// mantra choice, the karaoke word-lighting, and "rounds today" are all
// runtime, visitor-local state - nothing here is server data (see
// lib/rounds.ts and lib/mantras.ts).

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  createKaraokeWord,
  karaokeBoundary,
  karaokeOnset,
  karaokeTap,
  type KaraokeWord,
} from "@/lib/japa-rhythm";
import { MANTRAS, setSelectedMantraId, useSelectedMantra, type Mantra } from "@/lib/mantras";
import { incrementRound, resetToday, useRoundsToday } from "@/lib/rounds";
// Type-only import - erased at compile time, so referencing these types
// here does NOT pull the voice pipeline into this component's bundle. The
// actual module is loaded with a dynamic import() inside handleVoiceToggle,
// only once a devotee opts in - see that function and lib/voice-japa.ts's
// file banner.
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

// The mantra text and its meaning are kept as FIXED text, identical in every
// locale, the same way the footer's mantra line and the AartiPeriod labels
// already are - this is liturgical Sanskrit, not site copy (see
// lib/mantras.ts). Only the small interactive chrome around it (rounds
// counter, reset, sound/voice toggles, and the "Mantra" selector label) is
// translated, via the "pages.chant" namespace.

/** iOS (any browser) plus iPadOS-masquerading-as-desktop. Used only to add
 * a gentle "voice works best in Safari" hint when the mic is blocked, since
 * third-party iOS browsers can't reliably reach the microphone. Guarded so
 * it never touches navigator on the server; the error state it gates only
 * ever renders after a client interaction anyway. */
function isProbablyIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return ua.includes("Macintosh") && typeof document !== "undefined" && "ontouchend" in document;
}

// "off"/"error" are UI-local states this component adds on top of what
// lib/voice-japa.ts itself reports (requesting-mic/listening) - the
// pipeline module has no concept of "not started yet" or "gave up", since
// it either is running or has handed control back via a callback.
type VoiceUiStatus = "off" | "error" | VoiceJapaStatus;

const VOICE_ERROR_MESSAGE_KEY: Record<VoiceJapaErrorReason, "voiceMicDenied" | "voiceUnsupported"> = {
  "mic-denied": "voiceMicDenied",
  unsupported: "voiceUnsupported",
};

/** Fired once per completed round (108 beads), in BOTH voice and tap modes.
 * Deliberately the ONLY outward-facing hook this component exposes - it does
 * no recording of its own (the on-device "rounds today" store is the only
 * memory this page keeps; see lib/rounds.ts). The parent may wire this to
 * anything (e.g. an optional signed-in dashboard) without this component
 * knowing or caring. */
export type ChantSpaceProps = {
  onRoundComplete?: () => void;
};

export function ChantSpace({ onRoundComplete }: ChantSpaceProps = {}) {
  const t = useTranslations("pages.chant");
  const roundsToday = useRoundsToday();
  const selectedMantra = useSelectedMantra();

  // Kept in a ref so the long-lived voice callbacks (set once, in
  // handleVoiceToggle) always read the CURRENT mantra - its rhythm floor and
  // its word count - even if the devotee switches mantra while listening,
  // without restarting the mic. Synced in an effect (below, alongside
  // advanceBeadsRef), not during render: the callbacks read it seconds
  // apart, so the effect has always run by the time one fires.
  const selectedMantraRef = useRef<Mantra>(selectedMantra);

  // In-progress beads within the CURRENT round only - intentionally not
  // persisted (lib/rounds.ts keeps completed rounds, nothing mid-round). A
  // reload simply starts the present round over; nothing is lost that this
  // page considers worth keeping.
  const [beadIndex, setBeadIndex] = useState(0);
  const [blooming, setBlooming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const soundOn = useSyncExternalStore(subscribeSound, getSoundSnapshot, getSoundServerSnapshot) === "1";

  // The karaoke cursor: which word of the selected mantra is lit. Pure
  // stepping lives in lib/japa-rhythm.ts (unit-tested); this only holds the
  // current value and re-syncs it on each rhythm event. HONEST NOTE: this is
  // onset-/tap-paced, NOT per-syllable transcription - there is no speech
  // model (we removed it deliberately). It follows the chanter's rhythm and
  // resets to the first word at every mantra boundary, so drift never
  // accumulates.
  const [karaoke, setKaraoke] = useState<KaraokeWord>(createKaraokeWord);

  const [voiceStatus, setVoiceStatus] = useState<VoiceUiStatus>("off");
  const [voiceError, setVoiceError] = useState<VoiceJapaErrorReason | null>(null);

  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceHandleRef = useRef<VoiceJapaHandle | null>(null);
  // Bumped on every toggle-on/toggle-off/unmount so a startVoiceJapa() call
  // that's still requesting the mic when the devotee cancels doesn't come
  // alive afterwards and silently start listening again - see
  // handleVoiceToggle.
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
   * state reads don't update until the next render. Fires onRoundComplete
   * once per crossed round - this is the single place a round completes, so
   * BOTH voice and tap flow through it. */
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
    for (let i = 0; i < completedRounds; i++) {
      incrementRound();
      onRoundComplete?.();
    }
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
    // Tap-mode karaoke: each tap flows the lit word forward by one, wrapping
    // at the end so the mantra keeps cycling and re-syncs every wordCount
    // taps - a tasteful echo of the voiced karaoke, without pretending a tap
    // maps to a specific syllable.
    setKaraoke((k) => karaokeTap(k, selectedMantraRef.current.words.length));
  }

  // A voice session's callbacks (passed to startVoiceJapa once, in
  // handleVoiceToggle) live for the whole time voice mode is on, calling
  // onMantraCompleted / onVocalOnset every so often as mantras and voiced
  // bursts are recognized - unlike a tap, which is a brand new click event
  // each time and always runs the current render's handleTap. Without this
  // ref, onMantraCompleted would keep calling the SAME advanceBeads closure
  // from the moment voice mode was turned on, reading whatever beadIndex was
  // at that instant forever after. Updating the ref in an effect (rather than
  // during render) is safe here specifically because voice completions are
  // seconds apart, never a synchronous burst - by the time one fires, the
  // effect from the previous render has long since run.
  const advanceBeadsRef = useRef(advanceBeads);
  useEffect(() => {
    advanceBeadsRef.current = advanceBeads;
    selectedMantraRef.current = selectedMantra;
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

  function handleSelectMantra(id: string) {
    if (id === selectedMantra.id) return;
    setSelectedMantraId(id);
    // A fresh mantra starts clean on its own first word (its word list may be
    // a different length; the old index could be out of range).
    setKaraoke(createKaraokeWord());
  }

  /** Turns hands-free chanting on or off. Every failure mode (denied
   * permission, an unsupported browser) is reported through voiceError and
   * simply leaves tap-to-count working - never a broken page. See
   * lib/voice-japa.ts's file banner for the vow this is built on: the mic
   * is only ever read locally, one loudness number at a time, and nothing
   * is ever recorded, stored, or sent anywhere - and nothing is downloaded,
   * so the toggle goes straight from "off" to "listening" the moment
   * permission is granted. The pipeline module is dynamically imported here
   * purely to keep it out of every page that never touches voice mode, not
   * because it has anything heavy to load. */
  async function handleVoiceToggle() {
    if (voiceStatus !== "off" && voiceStatus !== "error") {
      voiceGenerationRef.current += 1;
      voiceHandleRef.current?.stop();
      voiceHandleRef.current = null;
      setVoiceStatus("off");
      setVoiceError(null);
      // Return the lit word to a calm first-word rest when listening stops.
      setKaraoke(createKaraokeWord());
      return;
    }

    const generation = ++voiceGenerationRef.current;
    setVoiceError(null);
    setKaraoke(createKaraokeWord());

    const { startVoiceJapa } = await import("@/lib/voice-japa");
    const handle = await startVoiceJapa(
      {
        onStatusChange: (status) => {
          if (voiceGenerationRef.current !== generation) return;
          setVoiceStatus(status);
        },
        onVocalOnset: () => {
          if (voiceGenerationRef.current !== generation) return;
          // Step the lit word once per voiced burst (onset-paced - see the
          // karaoke note above).
          setKaraoke((k) => karaokeOnset(k, selectedMantraRef.current.words.length));
        },
        onMantraCompleted: (n) => {
          if (voiceGenerationRef.current !== generation) return;
          advanceBeadsRef.current(n);
          // The breath that completes a mantra is the boundary: re-sync the
          // karaoke to the first word so drift never accumulates.
          setKaraoke(karaokeBoundary());
        },
        onError: (reason) => {
          if (voiceGenerationRef.current !== generation) return;
          setVoiceStatus("error");
          setVoiceError(reason);
          voiceHandleRef.current = null;
        },
      },
      {
        // Read fresh per frame, so switching mantra mid-session applies the
        // new mantra's rhythm floor immediately without restarting the mic.
        getMinPhraseMs: () => selectedMantraRef.current.minMantraMs,
      }
    );

    if (voiceGenerationRef.current !== generation) {
      // Cancelled (toggled off, or the page unmounted) while the mic
      // permission prompt was still in flight - stop it immediately rather
      // than let a stale session come alive.
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
  const showIosHint = voiceStatus === "error" && isProbablyIos();

  // The mantra, word by word, split into its traditional lines with the one
  // lit word glowing (see .chant-verse / .chant-word in globals.css).
  const lineBreaks = new Set(selectedMantra.lineBreakAfter ?? []);
  const commaAfter = new Set(selectedMantra.commaAfter ?? []);
  const verseLines: { index: number; text: string }[][] = [[]];
  selectedMantra.words.forEach((word, i) => {
    verseLines[verseLines.length - 1].push({ index: i, text: commaAfter.has(i) ? `${word},` : word });
    if (lineBreaks.has(i)) verseLines.push([]);
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      {/* The page's opening invocation - a warm call to Śrīmatī Rādhārāṇī,
          fixed regardless of which mantra is being counted below. */}
      <p className="text-[13px] uppercase tracking-[0.24em] text-marigold">Rādhe Rādhe</p>

      {/* Centerpiece: the mantra itself, lit word by word, with its
          Devanagari gracefully beneath. This is the one h1 on the page. */}
      <h1 className="chant-verse font-heading mt-6 text-chandan" lang="sa-Latn">
        {verseLines.map((line, li) => (
          <span key={li} className="chant-verse-line">
            {line.map(({ index, text }) => (
              <span key={index} className={`chant-word${index === karaoke.index ? " is-lit" : ""}`}>
                {text}
              </span>
            ))}
          </span>
        ))}
      </h1>

      {selectedMantra.devanagari && (
        <p className="chant-devanagari font-heading mt-3 text-chandan" lang="hi" aria-hidden="true">
          {selectedMantra.devanagari}
        </p>
      )}

      {/* The mala: 108 quiet marks in a ring, with the eyes-closed tap bowl
          at its heart. */}
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

      {/* The mantra selector - a quiet segmented switch, never a loud
          dropdown. Names inside are fixed liturgical text; only the "Mantra"
          label is translated. */}
      <div className="mt-8 flex flex-col items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{t("mantraLabel")}</span>
        <div className="mantra-switch" role="group" aria-label={t("mantraLabel")}>
          {MANTRAS.map((mantra) => (
            <button
              key={mantra.id}
              type="button"
              aria-pressed={mantra.id === selectedMantra.id}
              aria-label={mantra.name}
              onClick={() => handleSelectMantra(mantra.id)}
              className="mantra-switch-option"
            >
              {mantra.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* The two quiet switches: a soft tone on a completed round, and
          hands-free "Chant aloud". */}
      <div className="mt-6 flex items-center gap-6">
        <button
          type="button"
          role="switch"
          aria-checked={soundOn}
          aria-label={t("soundAria")}
          onClick={handleSoundToggle}
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-text-muted outline-none transition-colors hover:text-flame focus-visible:text-flame"
        >
          <span
            className={`inline-block h-[9px] w-[9px] rounded-full border border-hairline transition-colors ${soundOn ? "bg-marigold" : "bg-transparent"}`}
            aria-hidden="true"
          />
          {t("sound")}
        </button>

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
      </div>

      <div className="mt-3 flex flex-col items-center gap-2">
        {voiceStatus === "requesting-mic" && <p className="text-[12px] text-text-muted">{t("voiceRequestingMic")}</p>}

        {voiceStatus === "error" && voiceError && (
          <p className="max-w-xs text-[12px] text-lotus">{t(VOICE_ERROR_MESSAGE_KEY[voiceError])}</p>
        )}

        {showIosHint && <p className="max-w-xs text-[12px] text-text-muted">{t("voiceIosSafariHint")}</p>}

        <p className="max-w-xs text-[11px] italic leading-relaxed text-text-muted">{t("voicePrivacy")}</p>
      </div>

      <p className="mt-8 max-w-md text-[14px] leading-relaxed text-text-muted">
        Not a chant to finish, but a prayer — Rādhārāṇī is the one who gives Kṛṣṇa, and to call
        her name first is how the soul approaches Him. In Śrīla Prabhupāda&rsquo;s sense of it, the
        mahā-mantra is the soul&rsquo;s own call: <em>&ldquo;O Lord, O energy of the Lord, please engage
        me in Your service.&rdquo;</em>
      </p>

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
