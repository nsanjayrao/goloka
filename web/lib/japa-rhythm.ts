// Pure, on-device RHYTHM counter for the chant space (see lib/voice-japa.ts,
// which drives this from a real mic via the Web Audio API). This file has
// NO side effects and touches no browser API - it is the reliable, testable
// heart of hands-free japa counting.
//
// THE VOW: nothing here ever downloads or uploads anything. It doesn't even
// try to recognize WORDS - there is no model, no dictionary, nothing to
// fetch. It listens to the RHYTHM of a voice: a mic frame's loudness
// (root-mean-square, "rms") comes in, is compared against an
// auto-calibrating noise floor, and is thrown away the instant it's been
// folded into a running tally. One completed mahā-mantra is a voiced
// "phrase" of plausible length followed by the little breath a devotee
// naturally takes before starting the next repetition.
//
// UNDER-COUNT BIAS, throughout this file: every threshold below is chosen so
// that an ambiguous case is NOT counted. A devotee would rather chant one
// extra mantra than be told the app counted more than they actually said.
// See each constant's comment for its specific role in that bias.

/** One polled sample of mic loudness. `rms` is the root-mean-square of one
 * short window of raw audio samples - a single number, 0 (silence) upward,
 * with no memory of the audio it was computed from (see lib/voice-japa.ts,
 * which computes this from an AnalyserNode and never stores the samples
 * themselves). `timeMs` is monotonically increasing wall-clock time in
 * milliseconds; frames are expected roughly every 30-50ms, but every
 * threshold here is duration-based (not frame-count-based) so the counter
 * is correct even if the real polling rate drifts or a device is slow. */
export type AudioFrame = {
  timeMs: number;
  rms: number;
};

// ---------- Tunable thresholds (every one is a documented trade-off) ----------

/** How long the very start of a listening session is treated as the
 * calibration window: during it, the floor tracks the MINIMUM rms seen so
 * far (see pushAudioFrame) rather than blending toward every frame. That
 * makes calibration safe even if a devotee starts chanting the instant the
 * mic opens (no "toggle on, wait a beat, then begin" assumption required) -
 * a loud first mantra can only ever pull the floor down toward its quietest
 * instant (a breath, a soft consonant), never up toward its own volume. */
export const CALIBRATION_MS = 1000;

/** How fast the noise floor continues to drift AFTER calibration - slow,
 * and (see pushAudioFrame) only ever nudged by frames NOT classified as
 * voice, so a long round of sustained chanting can never drag the floor up
 * and start silencing itself out. This is what makes the floor "continuous"
 * per the design brief - a fan switching on mid-round, or a devotee moving
 * to a noisier room, is still tracked, just gently. */
const NOISE_FLOOR_TAU_MS = 4000;

/** Voice is "active" once a frame's rms clears the noise floor by this
 * multiple... */
const VOICE_RATIO = 1.8;
/** ...or by this absolute margin, whichever is bigger. The absolute floor
 * matters in a genuinely silent room, where the noise floor itself is close
 * to 0 - a pure ratio test would then call almost any tiny sound "active".
 * Both numbers were picked to comfortably separate a spoken mantra's
 * loudness from typical room/fan noise without any per-user tuning; the
 * devotee never sets a threshold. */
const VOICE_MARGIN = 0.006;

/** A raw-active reading must hold for this long before it's believed enough
 * to start (or resume, mid-phrase) counting toward a phrase's voiced
 * duration - "a small debounce so a single noisy frame doesn't trigger"
 * (one stray click/pop is one frame, ~30-50ms, well under this). Small
 * relative to MIN_PHRASE_MS on purpose: this is a sanity filter, not a
 * second minimum-duration gate. */
export const DEBOUNCE_MS = 60;

/** How long silence must persist before a NEW vocal onset can fire (see
 * pushAudioFrame's onset detection). A vocal onset is a silence→voice
 * transition; the karaoke word-lighting in components/chant-space.tsx steps
 * the lit word once per onset. Set equal to DEBOUNCE_MS so a burst has to
 * both go quiet for a beat AND then clear the same debounce again to count
 * as a fresh onset - a single sub-frame dip inside one continuous word never
 * fires a spurious extra onset. This is deliberately rhythm-level, NOT
 * per-syllable: it follows the chanter's pacing, it does not transcribe
 * words (there is no speech model - see the file banner). */
export const ONSET_REARM_MS = DEBOUNCE_MS;

/** The size of gap the mahā-mantra's OWN internal pauses ("Hare Hare …
 * Kṛṣṇa Kṛṣṇa") can plausibly reach - documented here as the concrete case
 * BREATH_GAP_MS (below) must sit safely above. Because this counter treats
 * any single gap shorter than BREATH_GAP_MS as still the same phrase (see
 * pushAudioFrame), every gap up to this size is guaranteed merged, never
 * mistaken for the breath between mantras. */
export const MICRO_GAP_MS = 250;

/** The minimum voiced duration - accumulated across a phrase, internal
 * micro-gaps already merged out - to even be ELIGIBLE to count as one
 * mahā-mantra. Chanted briskly the mantra still takes meaningfully longer
 * than this; a cough, a single word, a stray "hello" clears the noise floor
 * but never gets anywhere near this long, so it's discarded, not counted.
 * This is the main guard against hallucinating mantras out of noise. */
export const MIN_PHRASE_MS = 2500;

/** The breath between mantras: once silence following an eligible phrase
 * reaches this length, the phrase is closed and - only if it was long
 * enough (MIN_PHRASE_MS) - counted. Sits comfortably above MICRO_GAP_MS so
 * the mantra's own internal pauses never trigger it early. Deliberately on
 * the short side of the owner's 350-500ms guidance: a shorter confirmation
 * gap means a completed mantra is acknowledged sooner (a nicer hands-free
 * feel) without meaningfully risking a false split, since a false split
 * would just delay the SAME phrase's credit into two chunks that still need
 * their own MIN_PHRASE_MS to count - worst case is another under-count, the
 * accepted bias, never an over-count. */
export const BREATH_GAP_MS = 400;

// ---------- The rolling state pushAudioFrame carries forward ----------

export type JapaRhythmState = {
  /** Wall-clock time of the very first frame ever seen, or null before it
   * arrives - anchors the CALIBRATION_MS window. */
  firstFrameMs: number | null;
  /** Wall-clock time of the most recently processed frame, or null before
   * the first one - used only to compute each frame's dt. */
  lastFrameMs: number | null;
  /** The auto-calibrating noise floor, in the same rms units as AudioFrame. */
  noiseFloor: number;
  /** How long (ms) the current run of raw-active frames has lasted - reset
   * to 0 the instant a frame reads as not-active. Drives the onset
   * debounce. */
  activeStreakMs: number;
  /** How long (ms) the current run of not-active frames has lasted - reset
   * to 0 the instant a frame reads as active. Drives the breath-gap
   * decision. */
  silenceMs: number;
  /** True once the CURRENT phrase's onset debounce has been satisfied at
   * least once - stays true across the phrase's own internal micro-gaps
   * (so those don't pay the debounce cost again), and resets to false the
   * moment the phrase closes (counted or discarded). */
  phraseConfirmed: boolean;
  /** True while inside a single CONFIRMED voiced burst - unlike
   * phraseConfirmed (phrase-level, spans a whole mantra's internal gaps),
   * this flips back to false after any silence of ONSET_REARM_MS, so each
   * fresh burst re-arms one vocal onset. Drives the karaoke word-stepping,
   * not the mantra count. */
  inVoicedBurst: boolean;
  /** Accumulated voiced duration of the current, still-open phrase. */
  phraseVoicedMs: number;
  /** Running total of mantras counted so far - convenience for callers that
   * want the cumulative number rather than just this frame's delta. */
  mantrasCompleted: number;
};

export function createJapaRhythmState(): JapaRhythmState {
  return {
    firstFrameMs: null,
    lastFrameMs: null,
    noiseFloor: 0,
    activeStreakMs: 0,
    silenceMs: 0,
    phraseConfirmed: false,
    inVoicedBurst: false,
    phraseVoicedMs: 0,
    mantrasCompleted: 0,
  };
}

/** Exponential-smoothing weight for a step of `dtMs` toward a time constant
 * of `tauMs` - frame-rate independent, so noise-floor adaptation behaves
 * the same whether frames arrive every 30ms or every 50ms. */
function smoothingAlpha(dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return 0;
  return 1 - Math.exp(-dtMs / tauMs);
}

/** Per-frame options. `minPhraseMs` overrides MIN_PHRASE_MS for the
 * currently-selected mantra (see lib/mantras.ts) - a short mantra like
 * "Rādhe Rādhe" needs a lower floor than the sixteen-word mahā-mantra, or a
 * brisk chanter would be undercounted. Defaults to MIN_PHRASE_MS (the
 * mahā-mantra's value) when omitted, so existing callers and tests are
 * unaffected. */
export type PushAudioFrameOptions = {
  minPhraseMs?: number;
};

/** Feeds one polled audio frame into the rolling rhythm state. Returns the
 * next state to carry forward plus three per-frame events:
 *  - `mantraCompleted` - THIS frame closed a voiced phrase long enough to
 *    credit one mantra. This is also the mantra BOUNDARY (the breath that
 *    completes a mantra); callers reset the karaoke word-lighting on it so
 *    every mantra re-syncs to its first word and drift never accumulates.
 *    `mantraBoundary` is returned as an explicit alias for that use.
 *  - `onset` - THIS frame is a confirmed silence→voice transition (a fresh
 *    voiced burst). The UI steps the lit karaoke word once per onset. This
 *    is rhythm-paced, NOT per-syllable transcription (there is no speech
 *    model - see the file banner); it follows the chanter's pacing and is
 *    resynced at every mantra boundary.
 * A real-time counter (unlike lib/mantra-count.ts's predecessor) never
 * reports more than one mantra per call - a phrase can only close once. Pure
 * and mutates nothing, so the browser-facing pipeline (lib/voice-japa.ts)
 * can hold the state in a variable across `setInterval` ticks and this
 * function stays fully unit-testable without a mic, an AudioContext, or any
 * browser API at all. */
export function pushAudioFrame(
  prev: JapaRhythmState,
  frame: AudioFrame,
  options?: PushAudioFrameOptions
): { state: JapaRhythmState; mantraCompleted: boolean; mantraBoundary: boolean; onset: boolean } {
  const minPhraseMs = options?.minPhraseMs ?? MIN_PHRASE_MS;
  const isFirstFrame = prev.firstFrameMs === null;
  const dt = prev.lastFrameMs === null ? 0 : Math.max(0, frame.timeMs - prev.lastFrameMs);
  const firstFrameMs = isFirstFrame ? frame.timeMs : prev.firstFrameMs!;
  const elapsedSinceStart = frame.timeMs - firstFrameMs;

  // 1. Classify this frame against the PRIOR noise floor - never the floor
  // this same frame is about to update - so a loud frame can't raise the
  // very threshold it's being tested against.
  const threshold = Math.max(prev.noiseFloor * VOICE_RATIO, prev.noiseFloor + VOICE_MARGIN);
  const rawActive = !isFirstFrame && frame.rms > threshold;

  // 2. Adapt the noise floor (see CALIBRATION_MS / NOISE_FLOOR_TAU_MS
  // comments above). During calibration the floor can only fall, tracking
  // the quietest instant seen so far; afterward it can drift either way but
  // only from frames NOT classified as voice, and slowly.
  let noiseFloor: number;
  if (isFirstFrame) {
    noiseFloor = frame.rms; // bootstrap directly - there is nothing to compare against yet
  } else if (elapsedSinceStart <= CALIBRATION_MS) {
    noiseFloor = Math.min(prev.noiseFloor, frame.rms);
  } else if (!rawActive) {
    noiseFloor = prev.noiseFloor + (frame.rms - prev.noiseFloor) * smoothingAlpha(dt, NOISE_FLOOR_TAU_MS);
  } else {
    noiseFloor = prev.noiseFloor; // chanting is happening - never let voice pull the floor up
  }

  // 3. Onset debounce + phrase accumulation. A raw-active streak has to
  // hold for DEBOUNCE_MS before it's trusted; once trusted for THIS phrase,
  // later micro-gaps (any gap under BREATH_GAP_MS - see MICRO_GAP_MS's
  // comment) don't force paying that cost again.
  const activeStreakMs = rawActive ? prev.activeStreakMs + dt : 0;
  const silenceMs = rawActive ? 0 : prev.silenceMs + dt;

  let phraseConfirmed = prev.phraseConfirmed;
  let phraseVoicedMs = prev.phraseVoicedMs;
  if (rawActive) {
    if (!phraseConfirmed && activeStreakMs >= DEBOUNCE_MS) phraseConfirmed = true;
    if (phraseConfirmed) phraseVoicedMs += dt;
  }

  // Vocal-onset detection (for karaoke word-lighting only - never touches
  // the mantra count). An onset is a confirmed silence→voice transition:
  // once a burst clears DEBOUNCE_MS it fires exactly one onset, and no
  // further onset can fire until silence of ONSET_REARM_MS re-arms it. This
  // is intentionally rhythm-level, not per-syllable - it steps the lit word
  // in time with the chanter's own pacing and is resynced every mantra.
  let inVoicedBurst = prev.inVoicedBurst;
  let onset = false;
  if (rawActive) {
    if (!inVoicedBurst && activeStreakMs >= DEBOUNCE_MS) {
      inVoicedBurst = true;
      onset = true;
    }
  } else if (silenceMs >= ONSET_REARM_MS) {
    inVoicedBurst = false;
  }

  // 4. The breath decision - evaluated exactly once, on the frame where
  // accumulated silence crosses BREATH_GAP_MS (phraseVoicedMs is reset to 0
  // as soon as this fires, so it can never fire twice for the same phrase).
  let mantraCompleted = false;
  let mantrasCompleted = prev.mantrasCompleted;
  if (!rawActive && phraseConfirmed && silenceMs >= BREATH_GAP_MS) {
    if (phraseVoicedMs >= minPhraseMs) {
      mantraCompleted = true;
      mantrasCompleted += 1;
    }
    // Either counted, or discarded as too short (a cough, a stray word) -
    // the phrase is closed either way, ready for the next one.
    phraseVoicedMs = 0;
    phraseConfirmed = false;
  }

  return {
    state: {
      firstFrameMs,
      lastFrameMs: frame.timeMs,
      noiseFloor,
      activeStreakMs,
      silenceMs,
      phraseConfirmed,
      inVoicedBurst,
      phraseVoicedMs,
      mantrasCompleted,
    },
    mantraCompleted,
    // The breath that completes a mantra IS the mantra boundary - returned
    // under its own name so the karaoke reset in chant-space.tsx reads
    // clearly, without re-deriving it from the count.
    mantraBoundary: mantraCompleted,
    onset,
  };
}

/** Convenience for tests (and any batch use): runs a whole array of frames
 * through a fresh state and returns just the final mantra count. */
export function countMantrasInFrames(frames: AudioFrame[]): number {
  let state = createJapaRhythmState();
  for (const frame of frames) {
    state = pushAudioFrame(state, frame).state;
  }
  return state.mantrasCompleted;
}

// ---------- Karaoke word-lighting (pure index stepping) ----------
// The lit-word cursor for components/chant-space.tsx, kept here as pure
// functions so the stepping is unit-tested the same way the counter is.
// `index` is the 0-based word currently lit in the selected mantra's
// `words` (see lib/mantras.ts); `primed` means "a fresh mantra is about to
// begin - the next onset/tap should light the FIRST word rather than step
// past it", which is what makes the first word of every repetition actually
// glow while it is being chanted (instead of being skipped).

export type KaraokeWord = {
  index: number;
  primed: boolean;
};

/** The starting cursor: first word, primed so the very first onset lights
 * word 0 rather than advancing to word 1. */
export function createKaraokeWord(): KaraokeWord {
  return { index: 0, primed: true };
}

/** Advance on a vocal onset (voice mode). Clamps at the last word - if a
 * devotee's bursts outnumber the mantra's words, the last word simply holds
 * lit until the mantra boundary resets everything. */
export function karaokeOnset(prev: KaraokeWord, wordCount: number): KaraokeWord {
  if (wordCount <= 0) return prev;
  if (prev.primed) return { index: 0, primed: false };
  return { index: Math.min(prev.index + 1, wordCount - 1), primed: false };
}

/** Advance on a tap (tap mode). Wraps back to the first word at the end so
 * the words keep flowing over successive taps, re-syncing every wordCount
 * taps - a tasteful, drift-free echo of the voiced karaoke without pretending
 * a tap maps to a specific syllable. */
export function karaokeTap(prev: KaraokeWord, wordCount: number): KaraokeWord {
  if (wordCount <= 0) return prev;
  if (prev.primed) return { index: 0, primed: false };
  return { index: (prev.index + 1) % wordCount, primed: false };
}

/** Reset at a mantra boundary: back to the first word, primed for the next
 * repetition, so drift never accumulates across mantras. */
export function karaokeBoundary(): KaraokeWord {
  return createKaraokeWord();
}
