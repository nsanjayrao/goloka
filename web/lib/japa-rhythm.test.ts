import { describe, expect, it } from "vitest";

import {
  type AudioFrame,
  BREATH_GAP_MS,
  countMantrasInFrames,
  createJapaRhythmState,
  createKaraokeWord,
  DEBOUNCE_MS,
  karaokeBoundary,
  karaokeOnset,
  karaokeTap,
  MICRO_GAP_MS,
  MIN_PHRASE_MS,
  ONSET_REARM_MS,
  pushAudioFrame,
} from "./japa-rhythm";

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
 * state, not just the count. */
function run(frames: AudioFrame[], options?: { minPhraseMs?: number }) {
  let state = createJapaRhythmState();
  let mantraEvents = 0;
  let onsetEvents = 0;
  let boundaryEvents = 0;
  for (const frame of frames) {
    const result = pushAudioFrame(state, frame, options);
    state = result.state;
    if (result.mantraCompleted) mantraEvents += 1;
    if (result.mantraBoundary) boundaryEvents += 1;
    if (result.onset) onsetEvents += 1;
  }
  return { state, mantraEvents, onsetEvents, boundaryEvents };
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

describe("mantra boundary equals the completion event (karaoke resync point)", () => {
  it("boundary events track mantra completions one-for-one", () => {
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

  it("a discarded (too-short) phrase produces no boundary - nothing to resync to", () => {
    const frames = framesFromSegments([segment(200, QUIET), segment(300, CHANT), segment(500, QUIET)]);
    expect(run(frames).boundaryEvents).toBe(0);
  });
});

describe("karaoke word-index stepping (pure)", () => {
  const WORDS = 16; // the mahā-mantra

  it("starts primed on the first word", () => {
    const k = createKaraokeWord();
    expect(k).toEqual({ index: 0, primed: true });
  });

  it("the first onset lights word 0 (not word 1) - the first word actually glows", () => {
    const k = karaokeOnset(createKaraokeWord(), WORDS);
    expect(k.index).toBe(0);
    expect(k.primed).toBe(false);
  });

  it("subsequent onsets step 0 → 1 → 2 …", () => {
    let k = karaokeOnset(createKaraokeWord(), WORDS); // 0
    k = karaokeOnset(k, WORDS); // 1
    k = karaokeOnset(k, WORDS); // 2
    expect(k.index).toBe(2);
  });

  it("clamps at the last word when bursts outnumber words (voice)", () => {
    let k = createKaraokeWord();
    for (let i = 0; i < WORDS + 5; i++) k = karaokeOnset(k, WORDS);
    expect(k.index).toBe(WORDS - 1);
  });

  it("a mantra boundary re-primes to the first word (drift never accumulates)", () => {
    let k = createKaraokeWord();
    k = karaokeOnset(k, WORDS); // 0
    k = karaokeOnset(k, WORDS); // 1
    k = karaokeBoundary();
    expect(k).toEqual({ index: 0, primed: true });
    // and the next onset again lights word 0, not word 1
    expect(karaokeOnset(k, WORDS).index).toBe(0);
  });

  it("tap stepping wraps at the end so the words keep flowing", () => {
    let k = createKaraokeWord();
    const seen: number[] = [];
    for (let i = 0; i < WORDS + 2; i++) {
      k = karaokeTap(k, WORDS);
      seen.push(k.index);
    }
    // first tap lights word 0, then 1..15, then wraps to 0, 1
    expect(seen[0]).toBe(0);
    expect(seen[WORDS - 1]).toBe(WORDS - 1);
    expect(seen[WORDS]).toBe(0);
    expect(seen[WORDS + 1]).toBe(1);
  });

  it("guards a zero-length word list (never divides by zero, never advances)", () => {
    const k = createKaraokeWord();
    expect(karaokeOnset(k, 0)).toBe(k);
    expect(karaokeTap(k, 0)).toBe(k);
  });
});
