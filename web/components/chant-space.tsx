"use client"; // the bead-by-bead tap, the mala ring, the sound toggle, and
// "rounds today" are all runtime, visitor-local state - nothing here is
// server data (see lib/rounds.ts).

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { incrementRound, resetToday, useRoundsToday } from "@/lib/rounds";

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

export function ChantSpace() {
  const t = useTranslations("pages.chant");
  const roundsToday = useRoundsToday();

  // In-progress beads within the CURRENT round only - intentionally not
  // persisted (lib/rounds.ts keeps completed rounds, nothing mid-round). A
  // reload simply starts the present round over; nothing is lost that this
  // page considers worth keeping.
  const [beadIndex, setBeadIndex] = useState(0);
  const [blooming, setBlooming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const soundOn = useSyncExternalStore(subscribeSound, getSoundSnapshot, getSoundServerSnapshot) === "1";

  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bloomTimer.current) clearTimeout(bloomTimer.current);
      if (ringTimer.current) clearTimeout(ringTimer.current);
      if (resetArmTimer.current) clearTimeout(resetArmTimer.current);
    };
  }, []);

  function handleTap() {
    const next = beadIndex + 1;
    if (next < BEADS_PER_ROUND) {
      setBeadIndex(next);
      return;
    }

    // The 108th bead: complete the round quietly - no fanfare, just a soft
    // acknowledgment, then the ring empties for the next round.
    setBeadIndex(BEADS_PER_ROUND);
    incrementRound();
    if (soundOn) playRoundChime();
    setBlooming(true);
    setAnnouncement(t("roundCompleteAnnounce"));

    if (bloomTimer.current) clearTimeout(bloomTimer.current);
    if (ringTimer.current) clearTimeout(ringTimer.current);
    bloomTimer.current = setTimeout(() => setBlooming(false), BLOOM_MS);
    ringTimer.current = setTimeout(() => setBeadIndex(0), RING_RESET_MS);
  }

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

  const beads = Array.from({ length: BEADS_PER_ROUND }, (_, i) => i < beadIndex);

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
        <button
          type="button"
          onClick={handleTap}
          className={`chant-tap${blooming ? " is-blooming" : ""}`}
          aria-label={t("tapAria", { count: beadIndex })}
        >
          <span className="font-heading text-3xl text-chandan">{beadIndex}</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">/ 108</span>
        </button>
      </div>

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

      <p className="mt-10 max-w-sm text-[12px] italic leading-relaxed text-text-muted">
        A companion for calling the holy name and counting rounds — offered humbly, not a
        replacement for chanting on tulasī beads.
      </p>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
