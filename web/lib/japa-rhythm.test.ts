import { describe, expect, it } from "vitest";

import {
  type AudioFrame,
  BREATH_GAP_MS,
  countMantrasInFrames,
  createJapaRhythmState,
  createKaraokeFlow,
  DEBOUNCE_MS,
  FLUID_CREDIT_MARGIN,
  karaokeFlowAdopt,
  karaokeFlowArm,
  karaokeFlowIndex,
  karaokeFlowResync,
  karaokeFlowRest,
  MAX_FRAME_DT_MS,
  MAX_PHRASE_CREDITS,
  MICRO_GAP_MS,
  MIN_PHRASE_MS,
  ONSET_REARM_MS,
  pushAudioFrame,
  type PushAudioFrameOptions,
} from "./japa-rhythm";
import { RADHA_MANTRA } from "./mantras";

// ---------- Synthetic frame generation ----------
// Every test builds its audio out of "segments" (a duration at a constant
// rms) rather than hand-writing individual {timeMs, rms} objects - this
// mirrors how a devotee's session actually looks (a stretch of quiet, a
// stretch of voice, ...) and keeps each test's intent readable.

const FRAME_MS = 40; // within the ~30-50ms polling cadence lib/voice-japa.ts uses

const QUIET = 0.01; // a genuinely quiet room
const CHANT = 0.12; // a spoken mahā-mantra, comfortably above QUIET
const NOISY_FLOOR = 0.05; // a fan/ambient-noise room
const CHANT_IN_NOISE = 0.22; // chanting loud enough to clear the noisy floor

function segment(durationMs: number, rms: number): { durationMs: number; rms: number } {
  return { durationMs, rms };
}

function framesFromSegments(segments: { durationMs: number; rms: number }[]): AudioFrame[] {
  const frames: AudioFrame[] = [];
  let t = 0;
  for (const seg of segments) {
    const steps = Math.round(seg.durationMs / FRAME_MS);
    for (let i = 0; i < steps; i++) {
      t += FRAME_MS;
      frames.push({ timeMs: t, rms: seg.rms });
    }
  }
  return frames;
}

/** Runs frames through pushAudioFrame one at a time (rather than the
 * countMantrasInFrames convenience) so a test can also inspect the final
 * state, not just the count. `initialState` lets a test chain runs (e.g.
 * learn a tempo under one mantra, then switch to another). */
function run(frames: AudioFrame[], options?: PushAudioFrameOptions, initialState = createJapaRhythmState()) {
  let state = initialState;
  let mantraEvents = 0;
  let onsetEvents = 0;
  let boundaryEvents = 0;
  let fluidEvents = 0;
  for (const frame of frames) {
    const result = pushAudioFrame(state, frame, options);
    state = result.state;
    if (result.mantraCompleted) mantraEvents += 1;
    if (result.mantraBoundary) boundaryEvents += 1;
    if (result.onset) onsetEvents += 1;
    if (result.fluid) fluidEvents += 1;
  }
  return { state, mantraEvents, onsetEvents, boundaryEvents, fluidEvents };
}

describe("constants: the documented design invariants hold", () => {
  it("DEBOUNCE_MS < MICRO_GAP_MS < BREATH_GAP_MS < MIN_PHRASE_MS", () => {
    expect(DEBOUNCE_MS).toBeLessThan(MICRO_GAP_MS);
    expect(MICRO_GAP_MS).toBeLessThan(BREATH_GAP_MS);
    expect(BREATH_GAP_MS).toBeLessThan(MIN_PHRASE_MS);
  });

  it("BREATH_GAP_MS sits in the owner-specified 350-500ms breath range", () => {
    expect(BREATH_GAP_MS).toBeGreaterThanOrEqual(350);
    expect(BREATH_GAP_MS).toBeLessThanOrEqual(500);
  });
});

describe("createJapaRhythmState", () => {
  it("starts at 0 mantras with no phrase in progress", () => {
    const state = createJapaRhythmState();
    expect(state.mantrasCompleted).toBe(0);
    expect(state.phraseConfirmed).toBe(false);
    expect(state.phraseVoicedMs).toBe(0);
  });
});

describe("one clean mantra: voiced phrase followed by a breath", () => {
  it("counts exactly 1", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(3000, CHANT), segment(600, QUIET)]);
    expect(countMantrasInFrames(frames)).toBe(1);
  });
});

describe("two mantras back to back, each with its own breath", () => {
  it("counts exactly 2, not 1 (breath resets the phrase) and not 3 (no phantom extra)", () => {
    const frames = framesFromSegments([
      segment(200, QUIET),
      segment(3000, CHANT),
      segment(500, QUIET), // the breath between them
      segment(3000, CHANT),
      segment(600, QUIET),
    ]);
    expect(countMantrasInFrames(frames)).toBe(2);
  });
});

describe("continuous chanting with no clear breath - the under-count bias", () => {
  it("never counts a mantra if voice never drops long enough to confirm a breath", () => {
    // 8s of unbroken chanting - several mantras' worth of TIME, but with no
    // gap ever reaching BREATH_GAP_MS this counter refuses to guess where
    // one mantra ends and the next begins. 0 is the correct, honest answer,
    // not a hallucinated 2 or 3.
    const frames = framesFromSegments([segment(200, QUIET), segment(8000, CHANT)]);
    expect(countMantrasInFrames(frames)).toBe(0);
  });

  it("resumes counting the moment a real breath finally appears", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(6000, CHANT), segment(600, QUIET)]);
    // The whole 6s only ever closes into ONE phrase once the breath lands -
    // still just 1 mantra credited, not "6000ms / 2500ms rounded down".
    expect(countMantrasInFrames(frames)).toBe(1);
  });
});

describe("internal micro-gaps within one mantra are merged, not split", () => {
  it("several <250ms dips inside one long phrase still count as exactly 1 mantra", () => {
    // Simulates "Hare Hare ... Kṛṣṇa Kṛṣṇa"-style internal pausing: four
    // voiced bursts separated by 150ms dips (under MICRO_GAP_MS), then one
    // real breath at the end.
    const frames = framesFromSegments([
      segment(200, QUIET),
      segment(800, CHANT),
      segment(150, QUIET),
      segment(800, CHANT),
      segment(150, QUIET),
      segment(800, CHANT),
      segment(150, QUIET),
      segment(800, CHANT),
      segment(500, QUIET), // the real breath
    ]);
    expect(countMantrasInFrames(frames)).toBe(1);
  });
});

describe("a cough or a single stray word does not count", () => {
  it("a short voiced burst well under MIN_PHRASE_MS, followed by a breath-length silence, counts 0", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(300, CHANT), segment(500, QUIET)]);
    expect(countMantrasInFrames(frames)).toBe(0);
  });
});

describe("long silence never counts", () => {
  it("5s of a quiet room counts 0", () => {
    const frames = framesFromSegments([segment(5000, QUIET)]);
    expect(countMantrasInFrames(frames)).toBe(0);
  });
});

describe("pure ambient/fan noise never counts", () => {
  it("noise that fluctuates but never clears the calibrated floor by VOICE_RATIO counts 0", () => {
    const frames = framesFromSegments([
      segment(1200, 0.03),
      segment(200, 0.045),
      segment(1200, 0.03),
      segment(200, 0.045),
      segment(1200, 0.03),
    ]);
    expect(countMantrasInFrames(frames)).toBe(0);
  });
});

describe("a single noisy-frame spike does not trigger a phrase (debounce)", () => {
  it("one frame at chanting volume, surrounded by silence, counts 0 and leaves no phrase open", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(FRAME_MS, CHANT), segment(600, QUIET)]);
    const { state, mantraEvents } = run(frames);
    expect(mantraEvents).toBe(0);
    expect(state.phraseConfirmed).toBe(false);
    expect(state.phraseVoicedMs).toBe(0);
  });
});

describe("auto-calibrating noise floor", () => {
  it("settles near a quiet room's ambient level within the calibration window", () => {
    const frames = framesFromSegments([segment(1000, QUIET)]);
    const { state } = run(frames);
    expect(state.noiseFloor).toBeCloseTo(QUIET, 5);
  });

  it("settles near a noisy room's ambient level, not the quiet-room default", () => {
    const frames = framesFromSegments([segment(1000, NOISY_FLOOR)]);
    const { state } = run(frames);
    expect(state.noiseFloor).toBeCloseTo(NOISY_FLOOR, 5);
  });

  it("still detects chanting correctly once calibrated to a noisy room", () => {
    const frames = framesFromSegments([
      segment(1200, NOISY_FLOOR),
      segment(3000, CHANT_IN_NOISE),
      segment(600, NOISY_FLOOR),
    ]);
    expect(countMantrasInFrames(frames)).toBe(1);
  });

  it("only needs a brief quieter instant, not a deliberate silent lead-in, even if chanting starts almost immediately", () => {
    // No silent pause before chanting - just the natural, brief onset ramp
    // any real voice has (a soft first instant before reaching full
    // volume). Calibration only ever tracks the MINIMUM it has seen, so
    // this one quiet instant is enough to anchor a sane floor; a
    // mathematically flat, zero-variation "voice" from the very first
    // sample is not something a real microphone produces, so it is not
    // something this test - or the calibration design - needs to handle.
    const frames = framesFromSegments([segment(150, 0.05), segment(2850, CHANT), segment(600, QUIET)]);
    expect(countMantrasInFrames(frames)).toBe(1);
  });

  it("keeps slowly adapting to ambient drift after calibration ends, without losing real chanting", () => {
    const frames = framesFromSegments([
      segment(1000, QUIET), // calibrates to a quiet room (~0.01)
      segment(6000, 0.015), // the room drifts slightly noisier between rounds - still well under chanting volume
      segment(3000, CHANT), // still clearly recognized as chanting against the drifted floor
      segment(600, 0.015), // breath, at the new ambient level
    ]);
    const { state, mantraEvents } = run(frames);
    expect(mantraEvents).toBe(1);
    expect(state.noiseFloor).toBeGreaterThan(QUIET); // it actually moved...
    expect(state.noiseFloor).toBeLessThan(0.016); // ...but only ever toward the quiet drift, never toward chanting volume
  });
});

describe("MIN_PHRASE_MS boundary", () => {
  it("a phrase well under MIN_PHRASE_MS never counts, even with a proper breath after it", () => {
    const frames = framesFromSegments([
      segment(200, QUIET),
      segment(MIN_PHRASE_MS - 300, CHANT),
      segment(500, QUIET),
    ]);
    expect(countMantrasInFrames(frames)).toBe(0);
  });

  it("a phrase comfortably over MIN_PHRASE_MS counts once the breath lands", () => {
    const frames = framesFromSegments([
      segment(200, QUIET),
      segment(MIN_PHRASE_MS + 300, CHANT),
      segment(500, QUIET),
    ]);
    expect(countMantrasInFrames(frames)).toBe(1);
  });
});

describe("empty input", () => {
  it("no frames at all counts 0", () => {
    expect(countMantrasInFrames([])).toBe(0);
  });
});

describe("per-mantra minimum phrase length (options.minPhraseMs)", () => {
  it("a short 1500ms phrase counts 0 at the default mahā-mantra floor", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(1500, CHANT), segment(500, QUIET)]);
    expect(countMantrasInFrames(frames)).toBe(0);
  });

  it("the SAME short phrase counts 1 under a shorter mantra's floor (e.g. Rādhe Rādhe, 1200ms)", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(1500, CHANT), segment(500, QUIET)]);
    // pushAudioFrame threads minPhraseMs through; countMantrasInFrames uses
    // the default, so we drive frames directly with the override here.
    expect(run(frames, { minPhraseMs: 1200 }).mantraEvents).toBe(1);
  });

  it("omitting the option is identical to passing the default MIN_PHRASE_MS", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(3000, CHANT), segment(600, QUIET)]);
    expect(run(frames).mantraEvents).toBe(run(frames, { minPhraseMs: MIN_PHRASE_MS }).mantraEvents);
  });
});

describe("vocal onsets: one per voiced burst, for karaoke word-stepping", () => {
  it("ONSET_REARM_MS equals the onset debounce (documented coupling)", () => {
    expect(ONSET_REARM_MS).toBe(DEBOUNCE_MS);
  });

  it("a single clean voiced burst fires exactly one onset", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(3000, CHANT), segment(600, QUIET)]);
    expect(run(frames).onsetEvents).toBe(1);
  });

  it("four bursts separated by real gaps fire four onsets (words can step four times)", () => {
    const frames = framesFromSegments([
      segment(200, QUIET),
      segment(600, CHANT),
      segment(200, QUIET), // gap comfortably over ONSET_REARM_MS - re-arms the next onset
      segment(600, CHANT),
      segment(200, QUIET),
      segment(600, CHANT),
      segment(200, QUIET),
      segment(600, CHANT),
      segment(500, QUIET),
    ]);
    expect(run(frames).onsetEvents).toBe(4);
  });

  it("a single sub-debounce dip inside one word does NOT fire a spurious extra onset", () => {
    const frames = framesFromSegments([
      segment(200, QUIET),
      segment(1000, CHANT),
      segment(FRAME_MS, QUIET), // one-frame dip, under ONSET_REARM_MS
      segment(1000, CHANT),
      segment(500, QUIET),
    ]);
    expect(run(frames).onsetEvents).toBe(1);
  });
});

describe("mantra boundary: any breath that closes a phrase (karaoke resync point)", () => {
  it("a counted mantra fires both a completion and a boundary", () => {
    const frames = framesFromSegments([
      segment(200, QUIET),
      segment(3000, CHANT),
      segment(500, QUIET),
      segment(3000, CHANT),
      segment(600, QUIET),
    ]);
    const { mantraEvents, boundaryEvents } = run(frames);
    expect(mantraEvents).toBe(2);
    expect(boundaryEvents).toBe(2);
  });

  it("a discarded (too-short) phrase still fires a boundary, but never a count", () => {
    // Half a mantra then silence: no bead is earned, but the karaoke has to
    // learn the devotee stopped, or its looping word-flow would cycle on in
    // an empty room. Counting stays conservative; only the karaoke widens.
    const frames = framesFromSegments([segment(200, QUIET), segment(300, CHANT), segment(500, QUIET)]);
    const { mantraEvents, boundaryEvents } = run(frames);
    expect(mantraEvents).toBe(0);
    expect(boundaryEvents).toBe(1);
  });

  it("silence alone never fires a boundary - there was no phrase to close", () => {
    expect(run(framesFromSegments([segment(3000, QUIET)])).boundaryEvents).toBe(0);
  });

  it("continuous chanting with no breath fires no boundary at all", () => {
    // The case that used to strand the highlight lit on the last word - the
    // flow now loops instead of waiting for a boundary that never comes.
    const frames = framesFromSegments([segment(200, QUIET), segment(8000, CHANT)]);
    expect(run(frames).boundaryEvents).toBe(0);
  });
});

// ---------- Fluid crediting (counting without a breath) ----------
// The scenarios that prove tempo-elapsed crediting: fluid chanting credits
// about the right number (never more), noise and coughs credit nothing and
// teach nothing, every breath reconciles, and the safety clamps hold.

const MAHA = { tempoSeedMs: 5500, mantraId: "maha" };

/** Two clean breath-delimited mantras of `ms` voiced time each - the minimum
 * to make the learned tempo confident. Returns the state to chain from.
 * NOTE on arithmetic: the first frame of a burst pays the debounce, so a
 * segment of N ms accumulates roughly N-40 ms of voiced time - tests
 * therefore assert against ranges, not exact equality. */
function learnTempo(ms: number, options: PushAudioFrameOptions) {
  const frames = framesFromSegments([
    segment(200, QUIET),
    segment(ms, CHANT),
    segment(500, QUIET),
    segment(ms, CHANT),
    segment(500, QUIET),
  ]);
  return run(frames, options);
}

describe("regression: a quick, real 'Śrī Rādhā' must count (2026-07-22)", () => {
  // Owner-reported bug: a single, correctly chanted "Śrī Rādhā" produced no
  // bead. Root cause, found by measuring actual VOICED time rather than
  // guessing: a natural two-word utterance runs ~350-550ms of voice once
  // the small gap between the words is excluded, but the shipped floor
  // (RADHA_MANTRA.minMantraMs) was 800ms - silently discarding a correctly
  // spoken mantra as "too short" every single time. These tests read the
  // REAL registered constant, not a copy of it, so a future edit to
  // mantras.ts that regresses the floor breaks this test immediately.
  const opts = { minPhraseMs: RADHA_MANTRA.minMantraMs };

  it("a brisk but real utterance (~500ms voiced) counts", () => {
    const frames = framesFromSegments([
      segment(300, QUIET),
      segment(180, CHANT), // "Śrī"
      segment(120, QUIET), // the natural gap between the two words
      segment(320, CHANT), // "Rādhā"
      segment(500, QUIET), // the breath
    ]);
    expect(run(frames, opts).mantraEvents).toBe(1);
  });

  it("an even quicker, softer utterance (~360ms voiced) still counts", () => {
    const frames = framesFromSegments([
      segment(300, QUIET),
      segment(140, CHANT),
      segment(90, QUIET),
      segment(220, CHANT),
      segment(500, QUIET),
    ]);
    expect(run(frames, opts).mantraEvents).toBe(1);
  });

  it("a single short blip (one syllable, ~180ms) still does not count", () => {
    // The floor exists precisely to keep rejecting this - lowering it to
    // fix real utterances must not also start counting a cough.
    const frames = framesFromSegments([segment(300, QUIET), segment(180, CHANT), segment(500, QUIET)]);
    expect(run(frames, opts).mantraEvents).toBe(0);
  });
});

describe("fluid crediting: chanting with no breath finally counts", () => {
  it("without a tempo seed, behaves exactly as before - unbroken chant credits 0", () => {
    // The original honest-undercount contract, preserved for any caller that
    // doesn't opt in to fluid crediting.
    const frames = framesFromSegments([segment(200, QUIET), segment(8000, CHANT)]);
    expect(countMantrasInFrames(frames)).toBe(0);
  });

  it("seed tier: a breathless session still moves the beads, undercounted", () => {
    // No breath EVER - the devotee the old counter left at zero forever.
    // Credits fire per SEED_CREDIT_FACTOR × seed (~9.6s of voice each):
    // 30s of chanting ≈ 5 mantras chanted → 3 credited. Moving, never over.
    const frames = framesFromSegments([segment(200, QUIET), segment(30000, CHANT)]);
    const { mantraEvents, fluidEvents } = run(frames, MAHA);
    expect(mantraEvents).toBe(3);
    expect(fluidEvents).toBe(3);
  });

  it("seed tier stays conservative: 8s of unbroken chant is still 0", () => {
    // 8s < SEED_CREDIT_FACTOR × 5500 = 9625 - under the first credit line.
    const frames = framesFromSegments([segment(200, QUIET), segment(8000, CHANT)]);
    expect(run(frames, MAHA).mantraEvents).toBe(0);
  });

  it("learned tempo: a fluid run credits one per mantra, reconciled at the breath", () => {
    // Learn ~5s per mantra from two clean repetitions, then chant ~16s
    // unbroken (≈3.2 mantras) and finally breathe: 2 credits in-flight
    // (at ~1.15T and ~2.3T) + 1 reconciled at the breath = 5 total.
    const learned = learnTempo(5000, MAHA);
    expect(learned.mantraEvents).toBe(2);
    const fluidRun = framesFromSegments([segment(16000, CHANT), segment(500, QUIET)]);
    const after = run(fluidRun, MAHA, learned.state);
    expect(after.fluidEvents).toBe(2);
    expect(after.mantraEvents).toBe(3);
  });

  it("one slow mantra never becomes two", () => {
    // 1.4× the learned tempo, then a breath: the in-flight credit at 1.15T
    // fires, and the small remainder (0.25T) earns nothing at the breath.
    const learned = learnTempo(5000, MAHA);
    const slow = framesFromSegments([segment(7000, CHANT), segment(500, QUIET)]);
    const after = run(slow, MAHA, learned.state);
    expect(after.mantraEvents).toBe(1);
  });

  it("a typical single mantra with a breath still counts exactly once", () => {
    // ~1.0T of voice never reaches the 1.15T fluid line - the breath path
    // credits it, exactly as before fluid crediting existed.
    const learned = learnTempo(5000, MAHA);
    const one = framesFromSegments([segment(5000, CHANT), segment(500, QUIET)]);
    const after = run(one, MAHA, learned.state);
    expect(after.mantraEvents).toBe(1);
    expect(after.fluidEvents).toBe(0);
  });

  it("noise credits nothing even with a seed and a learned tempo", () => {
    const learned = learnTempo(5000, MAHA);
    const noise = framesFromSegments([
      segment(1200, 0.03),
      segment(200, 0.045),
      segment(1200, 0.03),
      segment(200, 0.045),
      segment(1200, 0.03),
    ]);
    expect(run(noise, MAHA, learned.state).mantraEvents).toBe(0);
  });

  it("a cough neither counts nor teaches the tempo", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(300, CHANT), segment(500, QUIET)]);
    const { state, mantraEvents } = run(frames, MAHA);
    expect(mantraEvents).toBe(0);
    expect(state.tempoSamples).toBe(0);
    expect(state.tempoMs).toBeNull();
  });

  it("learns the devotee's pace from clean repetitions", () => {
    const { state } = learnTempo(5000, MAHA);
    expect(state.tempoSamples).toBe(2);
    // voiced time ≈ 4960 per mantra (the first frame pays the debounce)
    expect(state.tempoMs).toBeGreaterThan(4800);
    expect(state.tempoMs).toBeLessThanOrEqual(5000);
  });

  it("adapts when the devotee's pace changes", () => {
    let { state } = learnTempo(6000, MAHA);
    const before = state.tempoMs!;
    // four quicker mantras with breaths pull the estimate down
    for (let i = 0; i < 4; i++) {
      const one = framesFromSegments([segment(4000, CHANT), segment(500, QUIET)]);
      state = run(one, MAHA, state).state;
    }
    expect(state.tempoMs!).toBeLessThan(before - 800);
  });

  it("after only ONE clean measurement, fluid crediting stays on the seed tier", () => {
    const oneMantra = framesFromSegments([segment(200, QUIET), segment(5000, CHANT), segment(500, QUIET)]);
    const learned = run(oneMantra, MAHA);
    expect(learned.state.tempoSamples).toBe(1);
    // 8s of unbroken chant: the learned tier (≈5.7s line) would credit, the
    // seed tier (9.6s line) must not - one sample is not confidence.
    const fluidRun = framesFromSegments([segment(8000, CHANT)]);
    expect(run(fluidRun, MAHA, learned.state).fluidEvents).toBe(0);
  });

  it("switching mantra resets the learned tempo and any open phrase", () => {
    const learned = learnTempo(5000, MAHA);
    expect(learned.state.tempoMs).not.toBeNull();
    // same frames, new mantra id: the old pace must not carry over
    const radha = { tempoSeedMs: 2200, mantraId: "radha" };
    const quiet = framesFromSegments([segment(200, QUIET)]);
    const after = run(quiet, radha, learned.state);
    expect(after.state.tempoMs).toBeNull();
    expect(after.state.tempoSamples).toBe(0);
    expect(after.state.phraseVoicedMs).toBe(0);
  });

  it("a frozen tab cannot mint credits (dt clamp)", () => {
    // 3s of real chanting, then ONE frame arriving 30 seconds late while
    // still "voiced" - without the clamp that single dt would inject 30s of
    // phantom voiced time and burst several seed-tier credits at once.
    const frames = framesFromSegments([segment(200, QUIET), segment(3000, CHANT)]);
    const last = frames[frames.length - 1];
    frames.push({ timeMs: last.timeMs + 30000, rms: CHANT });
    const { state, mantraEvents } = run(frames, MAHA);
    expect(mantraEvents).toBe(0);
    expect(state.phraseVoicedMs).toBeLessThanOrEqual(3000 + MAX_FRAME_DT_MS);
  });

  it("an unbroken phrase stops crediting at the cap until a breath re-anchors", () => {
    // ~200s of continuous voice at a learned ~5s tempo would earn ~34
    // credits unbounded; the cap holds it to MAX_PHRASE_CREDITS. (If this
    // much truly unbroken "chanting" is real, it isn't japa - it's a TV.)
    const learned = learnTempo(5000, MAHA);
    const unitMs = learned.state.tempoMs! * FLUID_CREDIT_MARGIN;
    const runMs = Math.ceil(unitMs * (MAX_PHRASE_CREDITS + 3));
    const marathon = framesFromSegments([segment(runMs, CHANT)]);
    const after = run(marathon, MAHA, learned.state);
    expect(after.fluidEvents).toBe(MAX_PHRASE_CREDITS);
  });
});

// ---------- Karaoke tempo flow ----------

describe("karaoke tempo flow", () => {
  const WORDS = 16; // the mahā-mantra
  const SEED = 5500; // its seed tempo, ms for the whole mantra

  it("at rest nothing is lit, however long the silence", () => {
    const flow = createKaraokeFlow(SEED);
    expect(flow.startedMs).toBeNull();
    expect(karaokeFlowIndex(flow, 1000, WORDS)).toBeNull();
    expect(karaokeFlowIndex(flow, 9000, WORDS)).toBeNull();
  });

  it("glides through the words in order at the seeded pace", () => {
    const flow = karaokeFlowArm(createKaraokeFlow(SEED), 1000);
    const perWord = SEED / WORDS; // ~344ms
    // sample the middle of each word's slot
    expect(karaokeFlowIndex(flow, 1000 + perWord * 0.5, WORDS)).toBe(0);
    expect(karaokeFlowIndex(flow, 1000 + perWord * 1.5, WORDS)).toBe(1);
    expect(karaokeFlowIndex(flow, 1000 + perWord * 7.5, WORDS)).toBe(7);
  });

  it("wraps to the first word instead of stalling lit on the last one", () => {
    // A devotee running one mantra into the next with no clear breath keeps
    // flowing instead of parking on the final golden word.
    const flow = karaokeFlowArm(createKaraokeFlow(SEED), 1000);
    const perWord = SEED / WORDS;
    expect(karaokeFlowIndex(flow, 1000 + perWord * (WORDS - 0.5), WORDS)).toBe(WORDS - 1);
    expect(karaokeFlowIndex(flow, 1000 + perWord * (WORDS + 0.5), WORDS)).toBe(0);
    expect(karaokeFlowIndex(flow, 1000 + perWord * (WORDS + 1.5), WORDS)).toBe(1);
  });

  it("never reads a word before the glide was armed (clock going backwards)", () => {
    const flow = karaokeFlowArm(createKaraokeFlow(SEED), 1000);
    expect(karaokeFlowIndex(flow, 900, WORDS)).toBe(0);
  });

  it("arming is idempotent within a mantra - later onsets don't restart it", () => {
    const armed = karaokeFlowArm(createKaraokeFlow(SEED), 1000);
    const again = karaokeFlowArm(armed, 3000);
    expect(again).toBe(armed);
    expect(again.startedMs).toBe(1000);
  });

  it("a rest stops the glide and keeps the tempo; resting at rest is a no-op", () => {
    const armed = karaokeFlowArm(createKaraokeFlow(SEED), 1000);
    const rested = karaokeFlowRest(armed);
    expect(rested.startedMs).toBeNull();
    expect(rested.mantraMs).toBe(armed.mantraMs);
    expect(karaokeFlowRest(rested)).toBe(rested);
  });

  it("a resync restarts the glide from word one right now", () => {
    const flow = karaokeFlowArm(createKaraokeFlow(SEED), 1000);
    const resynced = karaokeFlowResync(flow, 7000);
    expect(karaokeFlowIndex(resynced, 7000 + 1, WORDS)).toBe(0);
  });

  it("adopts the counter's learned tempo - one clock for words and beads", () => {
    const flow = createKaraokeFlow(SEED);
    const adopted = karaokeFlowAdopt(flow, 4200);
    expect(adopted.mantraMs).toBe(4200);
    // null (nothing learned yet) leaves the seed untouched
    expect(karaokeFlowAdopt(flow, null)).toBe(flow);
    // an absurd value is clamped, never trusted raw
    expect(karaokeFlowAdopt(flow, 50).mantraMs).toBeGreaterThanOrEqual(300);
  });

  it("guards a zero-length word list", () => {
    const flow = karaokeFlowArm(createKaraokeFlow(SEED), 1000);
    expect(karaokeFlowIndex(flow, 5000, 0)).toBeNull();
  });
});
