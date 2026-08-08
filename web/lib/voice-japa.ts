// The on-device voice-counting pipeline for the chant space (see
// components/chant-space.tsx for the UI that drives this).
//
// THE VOW: a devotee's chanting NEVER leaves their device, and NOTHING is
// ever downloaded to make this work. There is no model, no weights file, no
// dictionary - just the browser's own Web Audio API doing simple on-device
// sound math. The mic stream is read locally, one short frame at a time;
// each frame is turned into a single loudness number (its root-mean-square,
// "rms") by lib/japa-rhythm.ts's pure counter, and the raw audio behind that
// number is discarded immediately - never recorded, never buffered to a
// file, never sent anywhere. The toggle goes straight from "off" to
// "listening" the instant the microphone permission is granted; there is no
// loading state beyond that brief permission prompt, because there is
// nothing to load.
//
// This deliberately does NOT attempt speech recognition. It listens to the
// RHYTHM of a voice instead - a voiced phrase of plausible length, followed
// by the little breath a devotee takes before starting the next repetition
// - which is enough to count mahā-mantras without ever needing to know what
// words were spoken. See lib/japa-rhythm.ts for the counting logic itself
// (a pure function, fully unit-tested) and every threshold's reasoning.

import { createJapaRhythmState, pushAudioFrame, type JapaRhythmState } from "@/lib/japa-rhythm";

// How often the AnalyserNode is polled for a fresh loudness reading - within
// the ~30-50ms cadence lib/japa-rhythm.ts's thresholds assume. A plain
// setInterval (not requestAnimationFrame) is used deliberately: counting a
// devotee's chanting shouldn't depend on the tab having an active paint
// loop, since eyes-closed hands-free chanting is exactly the moment a
// visitor is least likely to be looking at (or even keeping focused on) the
// tab.
const FRAME_INTERVAL_MS = 40;

// A wide enough time-domain window to compute a stable RMS reading each poll
// without being so large it blurs together a real word boundary. Expressed
// in MILLISECONDS and converted against the context's real sample rate
// (below), because `fftSize` is a SAMPLE COUNT, not a duration: a fixed 2048
// is 43ms at 48kHz but 128ms at the 16kHz rate some Android voice-processing
// paths hand back - three times the poll interval, which smears every
// reading and makes the micro-gap thresholds meaningless.
const TARGET_WINDOW_MS = 30;

/** The smallest legal AnalyserNode fftSize (a power of two, 32..32768) whose
 * window covers TARGET_WINDOW_MS at this context's actual sample rate. */
function fftSizeFor(sampleRate: number): number {
  const targetSamples = (sampleRate * TARGET_WINDOW_MS) / 1000;
  let size = 32;
  while (size < targetSamples && size < 32768) size *= 2;
  return size;
}

// Timer-throttling detection. The poll runs every 40ms; anything past this
// means the browser is clamping the timer - which is exactly what mobile
// browsers do to a hidden or screen-locked tab, and screen-off chanting is
// this feature's PRIMARY use case. Three consecutive slow frames rather than
// one, so a single GC pause or a busy main thread isn't mistaken for it.
const THROTTLE_DT_MS = 150;
const THROTTLE_STRIKES = 3;

export type VoiceJapaStatus = "requesting-mic" | "listening" | "paused";

/** The subset of the Screen Wake Lock API this file uses. Declared locally
 * rather than relying on the DOM lib, so a TS target without those types
 * still compiles - and the whole thing is feature-detected at runtime. */
type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export type VoiceJapaErrorReason =
  | "unsupported" // browser lacks getUserMedia/AudioContext
  | "mic-denied"; // permission denied, no mic, or the prompt was dismissed

export type VoiceJapaCallbacks = {
  onStatusChange?: (status: VoiceJapaStatus) => void;
  /** Fires once per detected mantra completion. The caller advances one bead
   * per call, the same as a tap, and re-syncs the karaoke word-lighting.
   * `info.fluid` distinguishes a mid-run credit (the tempo counter saying
   * "one mantra just finished inside continuous chanting" - the karaoke
   * re-arms its glide) from a breath-closed one (the karaoke rests).
   * `info.tempoMs` is the counter's current learned per-mantra duration
   * (null before the first clean measurement) - the karaoke adopts it so
   * words and beads share one clock. */
  onMantraCompleted?: (n: number, info: { fluid: boolean; tempoMs: number | null }) => void;
  /** Fires when a breath closes a phrase, whether or not it counted - always
   * AFTER onMantraCompleted when the same breath did both, so a caller that
   * learns the chanter's tempo on completion still sees the mantra's timing
   * before this rests it. For the karaoke word-lighting only; it never
   * affects the count. */
  onMantraBoundary?: () => void;
  /** Fires once per confirmed vocal onset (a silence→voice transition) for
   * the karaoke word-lighting only - it never affects the count. Rhythm-
   * paced, not per-syllable (there is no speech model - see the file
   * banner). */
  onVocalOnset?: () => void;
  onError?: (reason: VoiceJapaErrorReason, error?: unknown) => void;
};

/** Options for a listening session. `getMinPhraseMs` lets the caller supply
 * the currently-selected mantra's rhythm floor fresh on every frame (see
 * lib/mantras.ts), so switching mantra mid-session takes effect immediately
 * without restarting the mic. Omitted → lib/japa-rhythm.ts's default. */
export type VoiceJapaOptions = {
  getMinPhraseMs?: () => number;
  /** The selected mantra's typical duration (lib/mantras.ts karaokeMs) -
   * seeds fluid crediting before the devotee's own tempo is learned. Read
   * fresh per frame, like getMinPhraseMs. */
  getTempoSeedMs?: () => number;
  /** The selected mantra's id - a switch resets the learned tempo and any
   * open phrase inside the rhythm state (see lib/japa-rhythm.ts). */
  getMantraId?: () => string;
};

export type VoiceJapaHandle = {
  /** Stops listening and releases the mic track (privacy + battery).
   * Safe to call more than once. */
  stop: () => void;
};

const NOOP_HANDLE: VoiceJapaHandle = { stop: () => {} };

function getAudioContextCtor(): typeof AudioContext | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

/** True only when every browser API this pipeline needs is present -
 * getUserMedia to open the mic, and AudioContext (which brings AnalyserNode
 * along with it - both are the same Web Audio API surface, so there is
 * nothing further to feature-test). Checked before ever touching the mic,
 * so an unsupported browser gets a clean, honest "unsupported" state
 * instead of a runtime crash. */
export function isVoiceJapaSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
  const hasAudioContext = !!getAudioContextCtor();
  return hasGetUserMedia && hasAudioContext;
}

/** Reads the AnalyserNode's current time-domain samples and returns their
 * root-mean-square loudness - a single number, thrown away by the caller
 * the instant lib/japa-rhythm.ts has folded it into the running rhythm
 * state. This is the entire "transcription": no words, no model, just
 * volume. */
function readRms(analyser: AnalyserNode, buffer: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(buffer);
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    const sample = buffer[i];
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

/** Starts hands-free listening: requests the mic, opens an AudioContext,
 * and begins polling loudness frames into the rhythm counter. Always
 * resolves (never throws) - failures are reported through
 * `callbacks.onError` and resolve to a harmless no-op handle, so a caller
 * can always safely treat the return value as "the thing to call .stop()
 * on" without a try/catch. */
export async function startVoiceJapa(
  callbacks: VoiceJapaCallbacks,
  options?: VoiceJapaOptions
): Promise<VoiceJapaHandle> {
  if (!isVoiceJapaSupported()) {
    callbacks.onError?.("unsupported");
    return NOOP_HANDLE;
  }

  // Create AND resume the AudioContext RIGHT NOW, before anything is
  // awaited - this function is called straight from the "Chant aloud" tap,
  // and on phones (iOS/Safari most strictly) an AudioContext may only be
  // started from within that user gesture. The getUserMedia await below
  // would otherwise "spend" the gesture, leaving the context stuck
  // "suspended" (permanently silent) on a phone - which is exactly why the
  // mic appeared not to work there. Creating + resuming it here, before the
  // await, captures the gesture. (It's closed again on the mic-denied path
  // just below so nothing leaks if permission is refused.)
  const AudioCtx = getAudioContextCtor()!;
  const audioContext = new AudioCtx();
  void audioContext.resume().catch(() => {});

  callbacks.onStatusChange?.("requesting-mic");
  let stream: MediaStream;
  try {
    // Ask the browser to clean the mic signal before we ever see it, so
    // the rhythm counter listens to the devotee, not the room:
    // - echoCancellation subtracts whatever THIS device is playing through
    //   its own speakers - which fixes the reported case of a video playing
    //   on the same laptop being counted as mantras (the browser has the
    //   speaker signal as a reference and removes it; the devotee's live
    //   voice, not in that reference, remains).
    // - noiseSuppression damps steady ambient (a fan, hum, a distant TV).
    // - autoGainControl OFF on purpose: with it on, the browser boosts
    //   quiet sounds up to normal levels, which would raise faraway
    //   ambient to "voice" loudness and cause false counts. Off keeps quiet
    //   things quiet, so only close, deliberate chanting clears the floor.
    // These are advisory booleans (not {exact}), so a browser/mic that
    // can't honor one simply ignores it rather than failing the request.
    // Honest limit: echoCancellation only cancels THIS device's own audio -
    // a separate TV, or a person talking loudly right beside the mic, can
    // still be misheard as chanting. Japa in a reasonably quiet spot, close
    // to the device, counts best.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
  } catch (error) {
    // Permission refused / no mic: release the AudioContext we opened
    // above so nothing lingers, then report cleanly.
    void audioContext.close().catch(() => {});
    callbacks.onError?.("mic-denied", error);
    return NOOP_HANDLE;
  }

  // Resume once more now that we're past the await - some phone browsers
  // suspend the context again while a permission prompt is on screen. If it
  // still can't resume, polling just reads near-silence rather than
  // crashing (a harmless degrade).
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      /* proceed regardless */
    }
  }

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSizeFor(audioContext.sampleRate);
  // Only time-domain data is read today, which smoothing does not touch - but
  // this default (0.8) averages the FREQUENCY data across roughly five
  // frames, so anything spectral added here later would be silently smeared
  // before it was ever looked at. Zero now, while it costs nothing.
  analyser.smoothingTimeConstant = 0;
  // Deliberately NOT connected to audioContext.destination - this pipeline
  // only ever reads the signal, never plays it back (no feedback, no
  // speaker output, nothing resembling "recording" in any user-facing
  // sense).
  source.connect(analyser);

  const timeDomainBuffer = new Float32Array(analyser.fftSize);
  let rhythmState: JapaRhythmState = createJapaRhythmState();
  let active = true;
  let lastPollMs: number | null = null;
  let throttleStrikes = 0;
  let paused = false;

  // Keep the screen awake while listening. Eyes-closed chanting with the
  // phone face-down is the whole point of voice mode, and a locked screen is
  // precisely when the browser throttles the timer this pipeline runs on (or,
  // on iOS, suspends the AudioContext outright). Entirely feature-detected;
  // where it is unavailable the throttle detection above is the safety net.
  // The lock is dropped automatically whenever the page is hidden, so it has
  // to be re-taken on the way back.
  let wakeLock: WakeLockSentinelLike | null = null;
  const wakeLockApi = (navigator as WakeLockNavigator).wakeLock;
  async function acquireWakeLock() {
    if (!wakeLockApi || wakeLock || !active) return;
    try {
      wakeLock = await wakeLockApi.request("screen");
    } catch {
      wakeLock = null; // denied, or not permitted in this context - degrade quietly
    }
  }
  function handleVisibilityChange() {
    if (document.visibilityState === "visible") void acquireWakeLock();
  }
  void acquireWakeLock();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  function pollFrame() {
    if (!active) return;

    // Is this poll arriving on time? lib/japa-rhythm.ts clamps each frame's
    // dt to MAX_FRAME_DT_MS, which keeps a frozen tab from injecting one
    // giant gap into the accumulators - but it also means a throttled timer
    // is absorbed SILENTLY: at a 1s clamped tick the counter sees 250ms of
    // elapsed time per real second and quietly under-counts about fourfold,
    // saying nothing. For a page whose whole posture is honesty, producing a
    // wrong number is worse than admitting the browser stopped cooperating.
    const now = performance.now();
    const sinceLastPoll = lastPollMs === null ? FRAME_INTERVAL_MS : now - lastPollMs;
    lastPollMs = now;
    if (sinceLastPoll > THROTTLE_DT_MS) {
      throttleStrikes += 1;
      if (throttleStrikes >= THROTTLE_STRIKES && !paused) {
        paused = true;
        callbacks.onStatusChange?.("paused");
      }
    } else if (paused) {
      // Frames are arriving on time again. Start over rather than resume:
      // the phrase in flight is long stale, and the room may not be the room
      // that was calibrated (a devotee who locked their phone in one place
      // and came back to another).
      throttleStrikes = 0;
      paused = false;
      rhythmState = createJapaRhythmState();
      callbacks.onStatusChange?.("listening");
    } else {
      throttleStrikes = 0;
    }
    // Count nothing while throttled - a paused bead is honest, a wrong one
    // is not.
    if (paused) return;

    const rms = readRms(analyser, timeDomainBuffer);
    // performance.now() for the frame clock, not audioContext.currentTime:
    // currentTime sits frozen at 0 while a context is suspended (the exact
    // phone failure the AudioContext-before-await fix addresses), which
    // would give the rhythm counter garbage timestamps even after the mic
    // works. performance.now() always advances, independent of audio state.
    // The third arg feeds the currently-selected mantra's rhythm floor
    // (lib/mantras.ts) fresh each frame, so switching mantra mid-session
    // takes effect without restarting the mic.
    const result = pushAudioFrame(
      rhythmState,
      { timeMs: performance.now(), rms },
      {
        minPhraseMs: options?.getMinPhraseMs?.(),
        tempoSeedMs: options?.getTempoSeedMs?.(),
        mantraId: options?.getMantraId?.(),
      }
    );
    rhythmState = result.state;
    if (result.onset) callbacks.onVocalOnset?.();
    // Completion first, then the boundary, so the caller sees the completed
    // mantra (and the freshly learned tempo) before the boundary rests the
    // karaoke.
    if (result.mantraCompleted) {
      callbacks.onMantraCompleted?.(1, { fluid: result.fluid, tempoMs: result.state.tempoMs });
    }
    if (result.mantraBoundary) callbacks.onMantraBoundary?.();
  }

  callbacks.onStatusChange?.("listening");
  const intervalId = setInterval(pollFrame, FRAME_INTERVAL_MS);

  return {
    stop: () => {
      if (!active) return;
      active = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void wakeLock?.release().catch(() => {});
      wakeLock = null;
      // The privacy + battery requirement: the mic track is released the
      // moment voice mode stops, not left open in the background.
      for (const track of stream.getTracks()) track.stop();
      void audioContext.close().catch(() => {});
    },
  };
}
