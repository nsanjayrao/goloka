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

// A wide enough time-domain window to compute a stable RMS reading each
// poll without being so large it blurs together a real word boundary.
const FFT_SIZE = 2048;

export type VoiceJapaStatus = "requesting-mic" | "listening";

export type VoiceJapaErrorReason =
  | "unsupported" // browser lacks getUserMedia/AudioContext
  | "mic-denied"; // permission denied, no mic, or the prompt was dismissed

export type VoiceJapaCallbacks = {
  onStatusChange?: (status: VoiceJapaStatus) => void;
  /** Fires once per detected mahā-mantra completion. The caller advances one
   * bead per call, the same as a tap. */
  onMantraCompleted?: (n: number) => void;
  onError?: (reason: VoiceJapaErrorReason, error?: unknown) => void;
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
export async function startVoiceJapa(callbacks: VoiceJapaCallbacks): Promise<VoiceJapaHandle> {
  if (!isVoiceJapaSupported()) {
    callbacks.onError?.("unsupported");
    return NOOP_HANDLE;
  }

  callbacks.onStatusChange?.("requesting-mic");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    callbacks.onError?.("mic-denied", error);
    return NOOP_HANDLE;
  }

  const AudioCtx = getAudioContextCtor()!;
  const audioContext = new AudioCtx();
  // Some browsers create a new AudioContext in a "suspended" state until a
  // user gesture resumes it. The mic permission prompt this function just
  // awaited IS that gesture in every browser tested, but resuming
  // explicitly costs nothing and protects against the rare case where the
  // await broke that association.
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      // Proceed regardless - polling will simply read near-silence until
      // the context resumes on its own (e.g. on the next user interaction),
      // which is a harmless degrade, not a crash.
    }
  }

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  // Deliberately NOT connected to audioContext.destination - this pipeline
  // only ever reads the signal, never plays it back (no feedback, no
  // speaker output, nothing resembling "recording" in any user-facing
  // sense).
  source.connect(analyser);

  const timeDomainBuffer = new Float32Array(analyser.fftSize);
  let rhythmState: JapaRhythmState = createJapaRhythmState();
  let active = true;

  function pollFrame() {
    if (!active) return;
    const rms = readRms(analyser, timeDomainBuffer);
    const result = pushAudioFrame(rhythmState, { timeMs: audioContext.currentTime * 1000, rms });
    rhythmState = result.state;
    if (result.mantraCompleted) callbacks.onMantraCompleted?.(1);
  }

  callbacks.onStatusChange?.("listening");
  const intervalId = setInterval(pollFrame, FRAME_INTERVAL_MS);

  return {
    stop: () => {
      if (!active) return;
      active = false;
      clearInterval(intervalId);
      // The privacy + battery requirement: the mic track is released the
      // moment voice mode stops, not left open in the background.
      for (const track of stream.getTracks()) track.stop();
      void audioContext.close().catch(() => {});
    },
  };
}
