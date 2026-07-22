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
  /** The devotee's learned per-mantra VOICED duration (micro-gaps and the
   * breath excluded), or null before the first clean measurement. Only
   * breath-delimited single-mantra phrases teach it at full weight - see the
   * fluid-crediting banner above. */
  tempoMs: number | null;
  /** How many full-weight measurements have been folded into tempoMs. */
  tempoSamples: number;
  /** EMA of the relative deviation between measurements - the consistency
   * gate for fluid crediting (erratic pace → no extrapolation). */
  tempoDeviation: number;
  /** Mantras already credited INSIDE the current open phrase (fluid
   * crediting). Reset to 0 whenever a breath closes the phrase - the breath
   * reconciles, so cross-phrase error cannot accumulate. */
  phraseCreditedCount: number;
  /** Which mantra the learned tempo (and open phrase) belong to - reset
   * everything tempo-related when the devotee switches mantras. */
  mantraKey: string | null;
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
    tempoMs: null,
    tempoSamples: 0,
    tempoDeviation: 0,
    phraseCreditedCount: 0,
    mantraKey: null,
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
  /** The selected mantra's typical full duration (lib/mantras.ts karaokeMs) -
   * the SEED for fluid crediting before the devotee's own tempo is learned.
   * Omitted → fluid crediting stays off and only breaths ever count (the
   * original, conservative behavior - existing tests rely on this). */
  tempoSeedMs?: number;
  /** Which mantra these frames belong to. When it changes, the learned tempo
   * AND any open phrase are discarded - a Rādhā-mantra pace must never
   * credit mahā-mantras, and voice accumulated under one mantra must never
   * complete under another's (shorter) floor. */
  mantraId?: string;
};

// ---------- Fluid crediting (counting without a breath) ----------
// The breath-gap counter above is honest but assumes breaths HAPPEN. A
// devotee chanting fluidly runs one mantra straight into the next with no
// 400ms silence - under breath-only counting an entire fluid run credits
// nothing (or one, at its eventual end). The fix: LEARN the devotee's own
// per-mantra voiced duration from clean breath-delimited repetitions, then
// credit a bead each time an unbroken phrase accumulates another mantra's
// worth of voiced time. Breaths remain the gold standard: only they teach
// the tempo at full weight, and every breath re-anchors the ledger to zero
// so error can never accumulate across phrases. Every constant below is
// biased toward UNDERCOUNT - a bead is never invented; this is an offering,
// not a scoreboard.

/** EMA weight per clean breath-delimited measurement - converges in ~5
 * breaths while smoothing over one odd repetition. */
export const TEMPO_ALPHA = 0.3;
/** Breath-delimited measurements required before the LEARNED tempo may
 * credit fluid runs. One measurement could be a fluke. */
export const TEMPO_CONFIDENT_SAMPLES = 2;
/** If the running relative deviation between measurements exceeds this, the
 * pace is too erratic to extrapolate from - fall back to the seed tier. */
export const TEMPO_CONSISTENT_DEV = 0.3;
/** Fluid credits fire at (k+1) × tempo × THIS - a 15% grace so a slightly
 * slower-than-usual repetition is never credited early. */
export const FLUID_CREDIT_MARGIN = 1.15;
/** At the breath ending a fluid run, the trailing remainder earns one final
 * credit only if it is at least this fraction of a whole mantra - a trailing
 * half-mantra stays uncounted. */
export const RECONCILE_MIN_FRACTION = 0.75;
/** Cold-start tier: before the tempo is learned, credit per THIS × the
 * mantra's typical duration (tempoSeedMs). Deliberately ~2× undercount for a
 * typical fluid chanter - beads move from the first session, honesty kept. */
export const SEED_CREDIT_FACTOR = 1.75;
/** Hard cap of credits per unbroken phrase (~3 minutes of the mahā-mantra
 * with not one 400ms breath). Beyond it, assume the signal isn't japa (a TV,
 * a conversation) and stop crediting until a breath re-anchors. */
export const MAX_PHRASE_CREDITS = 32;
/** A single inter-frame gap can contribute at most this much to any time
 * accumulator. A frozen tab or a slept phone otherwise injects one giant dt
 * into phraseVoicedMs - harmless under breath-only counting (capped at one
 * phantom credit), but an overcount mint under elapsed-time crediting. */
export const MAX_FRAME_DT_MS = 250;
// A full-weight measurement is rejected above 2.5× the current tempo (or
// 20s when unlearned) so one merged double-mantra can't poison the estimate;
// fluid runs teach at HALF weight and only when their per-mantra average
// sits within 25% of the current tempo.
const TEMPO_LEARN_CEILING_FACTOR = 2.5;
const TEMPO_LEARN_MAX_MS = 20000;
const FLUID_LEARN_TOLERANCE = 0.25;

/** The crediting unit for an open phrase: the learned tempo (with margin)
 * once it is confident and consistent, else the conservative seed tier,
 * else null - fluid crediting off. Pure so tests can pin the tiers. */
function creditUnitMs(state: JapaRhythmState, tempoSeedMs: number | undefined): number | null {
  if (
    state.tempoMs !== null &&
    state.tempoSamples >= TEMPO_CONFIDENT_SAMPLES &&
    state.tempoDeviation <= TEMPO_CONSISTENT_DEV
  ) {
    return state.tempoMs * FLUID_CREDIT_MARGIN;
  }
  if (tempoSeedMs !== undefined && tempoSeedMs > 0) return tempoSeedMs * SEED_CREDIT_FACTOR;
  return null;
}

/** Feeds one polled audio frame into the rolling rhythm state. Returns the
 * next state to carry forward plus three per-frame events:
 *  - `mantraCompleted` - THIS frame closed a voiced phrase long enough to
 *    credit one mantra. Callers advance one bead and re-sync the karaoke to
 *    the first word, so drift never accumulates.
 *  - `mantraBoundary` - THIS frame closed a phrase by a breath, whether or
 *    not it counted. Broader than mantraCompleted on purpose: it is what
 *    tells the karaoke the chanter has fallen silent, so the word-flow rests
 *    instead of looping on into an empty room.
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
): {
  state: JapaRhythmState;
  mantraCompleted: boolean;
  mantraBoundary: boolean;
  onset: boolean;
  /** True when this frame's completion was a FLUID credit (mid-phrase, at
   * the learned/seeded tempo) rather than a breath-closed one - the karaoke
   * re-arms its glide on a fluid credit instead of resting. */
  fluid: boolean;
} {
  const minPhraseMs = options?.minPhraseMs ?? MIN_PHRASE_MS;
  const mantraId = options?.mantraId ?? null;

  // A mantra switch discards the learned tempo AND any open phrase: pace
  // learned on one mantra must never credit another, and voice accumulated
  // under the mahā-mantra must never complete under the Rādhā mantra's
  // shorter floor.
  if (mantraId !== prev.mantraKey) {
    prev = {
      ...prev,
      mantraKey: mantraId,
      tempoMs: null,
      tempoSamples: 0,
      tempoDeviation: 0,
      phraseCreditedCount: 0,
      phraseVoicedMs: 0,
      phraseConfirmed: false,
      activeStreakMs: 0,
      inVoicedBurst: false,
    };
  }

  const isFirstFrame = prev.firstFrameMs === null;
  // Clamped: one frozen tab or slept phone otherwise injects a giant dt
  // straight into the accumulators (see MAX_FRAME_DT_MS).
  const dt =
    prev.lastFrameMs === null
      ? 0
      : Math.min(Math.max(0, frame.timeMs - prev.lastFrameMs), MAX_FRAME_DT_MS);
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

  // 4. Crediting. Two paths, mutually exclusive on any one frame (one needs
  // voice, the other needs silence), so the "never more than one mantra per
  // call" invariant holds by construction.
  let mantraCompleted = false;
  let mantraBoundary = false;
  let fluid = false;
  let mantrasCompleted = prev.mantrasCompleted;
  let phraseCreditedCount = prev.phraseCreditedCount;
  let tempoMs = prev.tempoMs;
  let tempoSamples = prev.tempoSamples;
  let tempoDeviation = prev.tempoDeviation;

  // 4a. FLUID crediting - while a confirmed phrase runs on with no breath,
  // credit each time another whole mantra's worth of voiced time (at the
  // learned or seeded unit - see creditUnitMs) has accumulated. The unit is
  // stable for the phrase's whole life: tempo only ever changes at a breath,
  // and a breath closes the phrase.
  const unit = creditUnitMs(prev, options?.tempoSeedMs);
  if (
    rawActive &&
    phraseConfirmed &&
    unit !== null &&
    phraseCreditedCount < MAX_PHRASE_CREDITS &&
    phraseVoicedMs >= (phraseCreditedCount + 1) * unit
  ) {
    phraseCreditedCount += 1;
    mantrasCompleted += 1;
    mantraCompleted = true;
    fluid = true;
  }

  // 4b. The breath decision - evaluated exactly once, on the frame where
  // accumulated silence crosses BREATH_GAP_MS (phraseVoicedMs is reset to 0
  // as soon as this fires, so it can never fire twice for the same phrase).
  // The breath RECONCILES a fluid run and is the only place tempo is
  // learned.
  if (!rawActive && phraseConfirmed && silenceMs >= BREATH_GAP_MS) {
    // The breath closed a phrase - a boundary for the KARAOKE regardless of
    // whether it earned a bead (see mantraBoundary's note in the return).
    mantraBoundary = true;
    if (phraseCreditedCount === 0) {
      // No fluid credits in this phrase - exactly the original path: one
      // credit if the phrase was long enough to be a real mantra.
      if (phraseVoicedMs >= minPhraseMs) {
        mantraCompleted = true;
        mantrasCompleted += 1;
        // Learn at FULL weight - a breath-delimited single mantra is the
        // cleanest measurement there is - unless it is implausibly long
        // (a merged double-mantra must not poison the estimate).
        const ceiling = tempoMs === null ? TEMPO_LEARN_MAX_MS : tempoMs * TEMPO_LEARN_CEILING_FACTOR;
        if (phraseVoicedMs <= ceiling) {
          if (tempoMs === null) {
            tempoMs = phraseVoicedMs;
            tempoDeviation = 0;
          } else {
            const dev = Math.abs(phraseVoicedMs - tempoMs) / tempoMs;
            tempoDeviation = tempoDeviation + (dev - tempoDeviation) * TEMPO_ALPHA;
            tempoMs = tempoMs + (phraseVoicedMs - tempoMs) * TEMPO_ALPHA;
          }
          tempoSamples += 1;
        }
      }
    } else if (unit !== null) {
      // A fluid run ends: credit the trailing remainder only if it is
      // nearly a whole mantra (a trailing half-mantra stays uncounted),
      // measured against the same base the credits used.
      const remainder = phraseVoicedMs - phraseCreditedCount * unit;
      const baseMantraMs =
        tempoMs !== null && tempoSamples >= TEMPO_CONFIDENT_SAMPLES && tempoDeviation <= TEMPO_CONSISTENT_DEV
          ? tempoMs
          : options?.tempoSeedMs ?? null;
      let totalCredits = phraseCreditedCount;
      if (
        baseMantraMs !== null &&
        remainder >= Math.max(minPhraseMs, RECONCILE_MIN_FRACTION * baseMantraMs)
      ) {
        mantraCompleted = true;
        mantrasCompleted += 1;
        totalCredits += 1;
      }
      // A clean fluid run keeps the tempo fresh at HALF weight - but only
      // when its per-mantra average agrees with what we already believe
      // (a run that divides strangely teaches nothing).
      if (tempoMs !== null && totalCredits > 0) {
        const perMantra = phraseVoicedMs / totalCredits;
        if (Math.abs(perMantra - tempoMs) / tempoMs < FLUID_LEARN_TOLERANCE) {
          tempoMs = tempoMs + (perMantra - tempoMs) * (TEMPO_ALPHA / 2);
        }
      }
    }
    // Counted, reconciled, or discarded as too short (a cough, a stray
    // word) - the phrase is closed either way, its ledger zeroed.
    phraseVoicedMs = 0;
    phraseConfirmed = false;
    phraseCreditedCount = 0;
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
      tempoMs,
      tempoSamples,
      tempoDeviation,
      phraseCreditedCount,
      mantraKey: prev.mantraKey,
    },
    mantraCompleted,
    // Any breath that CLOSED a phrase this frame - counted or discarded as
    // too short. Deliberately broader than mantraCompleted: the karaoke
    // word-flow loops while voice continues, so it needs to know the chanter
    // has stopped even when the phrase never earned a bead (half a mantra,
    // then silence). Counting stays as conservative as ever - only
    // mantraCompleted moves a bead.
    mantraBoundary,
    onset,
    fluid,
  };
}

/** Convenience for tests (and any batch use): runs a whole array of frames
 * through a fresh state and returns just the final mantra count. */
export function countMantrasInFrames(frames: AudioFrame[], options?: PushAudioFrameOptions): number {
  let state = createJapaRhythmState();
  for (const frame of frames) {
    state = pushAudioFrame(state, frame, options).state;
  }
  return state.mantrasCompleted;
}

// ---------- Karaoke tempo flow ----------
// A tiny state machine that paces the lit word to the chanter's own tempo.
// The component (components/chant-space.tsx) ticks a clock a few times a
// second and asks karaokeFlowIndex which word should be lit "now"; these
// functions carry only the timing state, no React. Everything is in the
// performance.now() millisecond clock the voice pipeline already uses.
//
// HONEST NOTE: this is rhythm-paced, NOT per-syllable transcription (there
// is no speech model - removed deliberately). Both modes play the same
// glide:
//   - Voice mode: a vocal onset arms the glide; it flows through the words
//     at the tempo the COUNTER has learned (adopted via karaokeFlowAdopt -
//     one tempo, one owner), wraps if the devotee runs mantras together,
//     and re-anchors at every credit and every breath.
//   - Tap mode: one tap = one whole chanted mantra = one full glide through
//     the verse at the mantra's typical pace, then rest. The same meaning a
//     tap has for the beads.
// At rest NOTHING is lit (karaokeFlowIndex returns null) - a glowing word
// with nobody chanting reads as frozen, not serene.

// Bounds any adopted/seeded tempo so a bad value can never make the glide
// strobe or freeze. A real spoken mantra sits comfortably inside this.
const KARAOKE_MIN_MANTRA_MS = 1200;
const KARAOKE_MAX_MANTRA_MS = 20000;

export type KaraokeFlow = {
  /** When the current glide began (performance.now clock), or null while
   * resting - nothing lit, waiting for the next repetition to start. */
  startedMs: number | null;
  /** The duration of one full mantra's glide, in ms - seeded from the
   * mantra's typical length (lib/mantras.ts karaokeMs) and thereafter
   * ADOPTED from the counter's learned tempo (JapaRhythmState.tempoMs), so
   * the words and the beads move to the same clock. */
  mantraMs: number;
};

/** A fresh flow, resting (nothing lit), seeded with the mantra's typical
 * full duration until the counter has learned the devotee's own. */
export function createKaraokeFlow(bootstrapMantraMs: number): KaraokeFlow {
  return {
    startedMs: null,
    mantraMs: clampMantraMs(bootstrapMantraMs),
  };
}

/** Arm the flow: the current mantra's voice has begun, start gliding from
 * the first word. Idempotent within a mantra - only the first call after a
 * rest takes effect; later onsets in the same mantra are ignored, since the
 * clock, not the onsets, drives the words. */
export function karaokeFlowArm(flow: KaraokeFlow, nowMs: number): KaraokeFlow {
  if (flow.startedMs !== null) return flow;
  return { ...flow, startedMs: nowMs };
}

/** Rest the flow - nothing lit, glide stopped, tempo kept. Used at every
 * breath (counted or not), when listening stops, and when a tap-glide
 * completes its single pass. */
export function karaokeFlowRest(flow: KaraokeFlow): KaraokeFlow {
  if (flow.startedMs === null) return flow;
  return { ...flow, startedMs: null };
}

/** Restart the glide from the first word RIGHT NOW, keeping the tempo -
 * used on a fluid credit (the counter says "one mantra just finished
 * mid-run"), so the words re-anchor in stride instead of resting, and on a
 * tap (one tap = one fresh glide). */
export function karaokeFlowResync(flow: KaraokeFlow, nowMs: number): KaraokeFlow {
  return { ...flow, startedMs: nowMs };
}

/** Adopt the counter's learned tempo (JapaRhythmState.tempoMs). The counter
 * measures VOICED time from real breath-delimited mantras - strictly better
 * data than anything the karaoke could measure for itself, and keeping a
 * single tempo means the words and the beads can never disagree. A null
 * (nothing learned yet) leaves the seed untouched. */
export function karaokeFlowAdopt(flow: KaraokeFlow, tempoMs: number | null): KaraokeFlow {
  if (tempoMs === null) return flow;
  const clamped = clampMantraMs(tempoMs);
  if (clamped === flow.mantraMs) return flow;
  return { ...flow, mantraMs: clamped };
}

/** Which word should be lit right now. Resting → null (nothing lit).
 * Underway → glide through the words in order, one every
 * mantraMs/wordCount, WRAPPING back to the first word at the end so a
 * devotee who runs one mantra straight into the next (with no breath clear
 * enough for the counter to see) keeps flowing instead of stalling lit on
 * the last word. Every credit and every breath re-anchors, so drift never
 * accumulates. Pure: the same inputs always give the same word, so the
 * driving clock can tick as often or seldom as it likes. */
export function karaokeFlowIndex(flow: KaraokeFlow, nowMs: number, wordCount: number): number | null {
  if (wordCount <= 0) return null;
  if (flow.startedMs === null) return null;
  const perWordMs = flow.mantraMs / wordCount;
  const elapsed = nowMs - flow.startedMs;
  if (elapsed <= 0) return 0;
  const step = Math.floor(elapsed / perWordMs);
  return step % wordCount;
}

function clampMantraMs(ms: number): number {
  return Math.max(KARAOKE_MIN_MANTRA_MS, Math.min(ms, KARAOKE_MAX_MANTRA_MS));
}
