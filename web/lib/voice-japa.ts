// The on-device voice-counting pipeline for the chant space (see
// components/chant-space.tsx for the UI that drives this).
//
// THE VOW: a devotee's chanting NEVER leaves their device. Nothing here
// ever uploads, records-to-a-server, or stores audio anywhere - the mic
// stream is read locally, turned into text locally, and thrown away
// locally, one rolling window at a time. The ONLY network request this
// file ever makes is the one-time fetch of the recognition MODEL WEIGHTS
// (a static file, the same for every visitor, cached by the browser after
// the first load) - never the voice itself. This is exactly why the
// browser's built-in SpeechRecognition API is not used here: it ships
// audio to a cloud speech service (Google, in Chrome) to do the work.
// Whisper, running fully client-side via Transformers.js, is the only way
// to keep the vow AND get real speech recognition.
//
// This module is dynamically imported (see chant-space.tsx) specifically
// so the model-loading library never enters the main bundle or any
// non-voice page - it only loads the moment a devotee opts in.

import {
  applyTranscriptWindow,
  createMantraCounterState,
  type MantraCounterState,
} from "@/lib/mantra-count";

// Multilingual whisper-tiny (NOT the .en variant) - the smallest Whisper
// checkpoint, quantized (~40MB fetched once, then cached by the browser
// forever). We don't need accurate transcription, only enough signal to
// catch the holy-name syllables; tiny is plenty and keeps the download
// light on a devotee's data plan (see the data-saver warning in
// chant-space.tsx).
const MODEL_ID = "Xenova/whisper-tiny";

// Each recording window is WINDOW_MS long; consecutive windows overlap by
// OVERLAP_MS so a mantra spoken right at a window boundary is never split
// by silence and lost. lib/mantra-count.ts's OVERLAP_CAP_LETTERS is
// calibrated to this exact OVERLAP_MS - if either changes, change the
// other's comment/value too.
const WINDOW_MS = 7000;
const OVERLAP_MS = 1500;
const STEP_MS = WINDOW_MS - OVERLAP_MS;

export type VoiceJapaStatus = "requesting-mic" | "loading-model" | "listening";

export type VoiceJapaErrorReason =
  | "unsupported" // browser lacks getUserMedia/MediaRecorder/AudioContext
  | "mic-denied" // permission denied, no mic, or the prompt was dismissed
  | "model-load-failed" // the model failed to download/initialize
  | "transcribe-failed"; // one recording window failed to decode/transcribe (see runWindow - the session keeps listening, this is reported but non-fatal)

export type VoiceJapaCallbacks = {
  onStatusChange?: (status: VoiceJapaStatus) => void;
  /** 0..1 download progress for the one-time model fetch. Only fires
   * during "loading-model". */
  onModelProgress?: (fraction: number) => void;
  /** Fires once per detected mahā-mantra completion (n is almost always
   * 1 - see mantra-count.ts's applyTranscriptWindow). The caller advances
   * one bead per unit of n, the same as a tap. */
  onMantraCompleted?: (n: number) => void;
  onError?: (reason: VoiceJapaErrorReason, error?: unknown) => void;
};

export type VoiceJapaHandle = {
  /** Stops recording, releases the mic track (privacy + battery), and
   * cancels any pending window. Safe to call more than once. */
  stop: () => void;
};

const NOOP_HANDLE: VoiceJapaHandle = { stop: () => {} };

/** True only when every browser API this pipeline needs is present.
 * Checked before ever touching the mic, so an unsupported browser gets a
 * clean, honest "unsupported" state instead of a runtime crash. */
export function isVoiceJapaSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
  const hasMediaRecorder = typeof window.MediaRecorder !== "undefined";
  const hasAudioContext =
    typeof window.AudioContext !== "undefined" ||
    typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== "undefined";
  const hasOfflineAudioContext = typeof window.OfflineAudioContext !== "undefined";
  return hasGetUserMedia && hasMediaRecorder && hasAudioContext && hasOfflineAudioContext;
}

// MediaRecorder's supported mimeTypes vary a lot by browser (Chrome/Firefox
// favor webm/opus, Safari favors mp4) - ask for the best available instead
// of hardcoding one and failing on browsers that don't support it.
const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/** Records exactly one window of audio from an already-open mic stream and
 * resolves with the raw blob. A new window is started every STEP_MS (see
 * scheduleLoop) while each one keeps recording for the full WINDOW_MS - so
 * consecutive windows genuinely overlap in wall-clock time by WINDOW_MS -
 * STEP_MS = OVERLAP_MS, running on independent MediaRecorder instances
 * that happen to share the same stream (which the API supports). This is
 * the recording-side half of the overlap; mantra-count.ts's
 * stripOverlapLetters is the transcript-side half that de-duplicates it. */
function recordWindow(stream: MediaStream, durationMs: number, mimeType: string | undefined): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (error) {
      reject(error);
      return;
    }
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) => {
      reject((event as unknown as { error?: unknown }).error ?? event);
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    recorder.start();
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, durationMs);
  });
}

/** Decodes a recorded blob into the mono 16kHz Float32 samples Whisper
 * expects. Mic capture is normally 44.1/48kHz - OfflineAudioContext's
 * render step resamples for us (and downmixes to mono) just by rendering
 * into a 1-channel, 16000Hz destination. */
async function decodeToWhisperInput(blob: Blob): Promise<Float32Array> {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    void decodeCtx.close().catch(() => {});
  }

  const sampleRate = 16000;
  const frameCount = Math.max(1, Math.ceil(decoded.duration * sampleRate));
  const offline = new OfflineAudioContext(1, frameCount, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

// The Transformers.js pipeline's exact return shape isn't worth importing
// the library's types for just to narrow one field - this is the only
// part of its output this file reads.
type TranscriptionResult = { text?: string } | { text?: string }[];

// A callable ASR pipeline, as returned by transformers.js's pipeline().
// Kept minimal and local rather than importing the library's full typing
// surface, since dynamic import already keeps the library itself out of
// the static bundle.
type Transcriber = (
  audio: Float32Array,
  options: { language: string; task: "transcribe" }
) => Promise<TranscriptionResult>;

let transcriberPromise: Promise<Transcriber> | null = null;

/** Lazily downloads and initializes the on-device Whisper pipeline
 * (cached across calls for the lifetime of the page - a second "Chant
 * aloud" toggle in the same visit is instant). Transformers.js is
 * dynamically imported here, not at module top-level, so it is only ever
 * fetched once a devotee actually opts into voice mode. */
async function getTranscriber(onProgress: (fraction: number) => void): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Belt-and-suspenders alongside the file banner's vow: this pipeline
      // is never given a reason to look anywhere but the model repo itself
      // for weights, and never told to touch a local filesystem (there
      // isn't one, in a browser) - the model is the only thing fetched.
      env.allowLocalModels = false;

      // Force SINGLE-THREADED WASM. onnxruntime-web's multi-threaded backend
      // needs SharedArrayBuffer, which the browser only exposes on a
      // cross-origin-isolated page (COOP: same-origin + COEP: require-corp
      // response headers). We deliberately do NOT set those site-wide -
      // COEP would break the YouTube-nocookie embeds, the i.ytimg.com
      // thumbnails, and the HF model fetch itself. Without isolation the
      // threaded runtime fails to start AFTER the weights finish
      // downloading - which surfaced as "the holy name counter couldn't
      // load" on the deployed site. Single-threaded needs no
      // SharedArrayBuffer and initializes everywhere; whisper-tiny is small
      // enough that one thread keeps pace with unhurried japa.
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.numThreads = 1;
      }

      const seenTotals = new Map<string, number>();
      return (await pipeline("automatic-speech-recognition", MODEL_ID, {
        // Pin the execution backend to WASM (do not auto-try WebGPU): WASM
        // runs on every browser a devotee might use, and getting it working
        // reliably matters more than the speed WebGPU would add on the
        // subset of devices that support it. (A WebGPU fast-path can come
        // later, once this is trusted.)
        device: "wasm",
        dtype: "q8", // quantized - smallest, fastest download and inference
        progress_callback: (progress: { status?: string; file?: string; loaded?: number; total?: number }) => {
          if (progress?.status !== "progress" || typeof progress.loaded !== "number") return;
          // transformers.js reports progress per-file (weights, tokenizer,
          // config, ...); track each file's own total and report the
          // single largest one's fraction, since the weights file
          // dominates the download and the small config/tokenizer files
          // would otherwise make the bar jump to 100% instantly and look
          // dishonest.
          if (typeof progress.total === "number" && progress.total > 0 && progress.file) {
            seenTotals.set(progress.file, progress.total);
          }
          const total = progress.file ? seenTotals.get(progress.file) : undefined;
          if (total) onProgress(Math.min(1, progress.loaded / total));
        },
      })) as unknown as Transcriber;
    })();
  }
  return transcriberPromise;
}

/** Starts listening: requests the mic, loads the model (reporting
 * progress), then begins the rolling overlapping-window recognition loop.
 * Always resolves (never throws) - failures are reported through
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

  callbacks.onStatusChange?.("loading-model");
  let transcriber: Transcriber;
  try {
    transcriber = await getTranscriber((fraction) => callbacks.onModelProgress?.(fraction));
  } catch (error) {
    for (const track of stream.getTracks()) track.stop();
    callbacks.onError?.("model-load-failed", error);
    return NOOP_HANDLE;
  }

  let active = true;
  let counterState: MantraCounterState = createMantraCounterState();
  let stepTimer: ReturnType<typeof setTimeout> | null = null;
  const mimeType = pickSupportedMimeType();

  // Windows are started on a fixed STEP_MS clock (scheduleLoop, below) so
  // they genuinely overlap in wall-clock time regardless of how long any
  // one window's transcription takes - but that also means they can
  // finish OUT OF ORDER (window 5 might transcribe faster than window 4).
  // A sequence number per window plus this ordered-application queue keeps
  // applyTranscriptWindow fed transcripts in the order they were SPOKEN,
  // not the order they happened to finish, which matters because its
  // overlap-dedup compares each window against the immediately preceding
  // one.
  let nextSequence = 0;
  let nextToApply = 0;
  const pendingResults = new Map<number, string>();
  // Bounds how many windows can be recording/transcribing at once - under
  // normal pacing this is 1-2 (WINDOW_MS/STEP_MS), but if a slow device's
  // transcription falls behind real time, this stops windows from piling
  // up without limit (each skipped tick just means slightly less overlap
  // coverage that moment, not a growing backlog eating the device alive).
  const MAX_CONCURRENT_WINDOWS = 2;
  let inFlight = 0;

  function applyPendingInOrder() {
    while (pendingResults.has(nextToApply)) {
      const text = pendingResults.get(nextToApply)!;
      pendingResults.delete(nextToApply);
      nextToApply++;
      if (!active) continue;
      const { state, newMantras } = applyTranscriptWindow(counterState, text);
      counterState = state;
      if (newMantras > 0) callbacks.onMantraCompleted?.(newMantras);
    }
  }

  async function runWindow(sequence: number) {
    let text = "";
    try {
      const blob = await recordWindow(stream, WINDOW_MS, mimeType);
      if (active) {
        const audio = await decodeToWhisperInput(blob);
        if (active) {
          // Forcing English as the target language (NOT auto-detect) is
          // deliberate: Whisper then transliterates unfamiliar
          // Sanskrit-ish syllables into Latin-alphabet English spelling
          // attempts (exactly the "krsna"/"haray"/"ram" style guesses
          // mantra-count.ts is built to catch) instead of risking it
          // guessing "Hindi" and returning Devanagari script, which the
          // parser would silently fail to match at all (it only ever
          // reads Latin letters).
          const result = await transcriber(audio, { language: "english", task: "transcribe" });
          text = Array.isArray(result) ? (result[0]?.text ?? "") : (result?.text ?? "");
        }
      }
    } catch (error) {
      // A single failed window (a decode hiccup, a transient pipeline
      // error) should not end the listening session - the devotee is
      // mid-round with their eyes closed, and losing a few seconds of
      // counting is far gentler than the whole feature silently dying.
      // `text` stays "" so this window simply contributes no tokens rather
      // than stalling every later window's turn in applyPendingInOrder.
      if (active) callbacks.onError?.("transcribe-failed", error);
    }
    pendingResults.set(sequence, text);
    applyPendingInOrder();
  }

  function scheduleLoop() {
    if (!active) return;
    if (inFlight < MAX_CONCURRENT_WINDOWS) {
      const sequence = nextSequence++;
      inFlight++;
      void runWindow(sequence).finally(() => {
        inFlight--;
      });
    }
    stepTimer = setTimeout(scheduleLoop, STEP_MS);
  }

  callbacks.onStatusChange?.("listening");
  scheduleLoop();

  return {
    stop: () => {
      if (!active) return;
      active = false;
      if (stepTimer) clearTimeout(stepTimer);
      // The privacy + battery requirement: the mic track is released the
      // moment voice mode stops, not left open in the background.
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
