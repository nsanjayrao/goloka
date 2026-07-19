"use client"; // Notification/pushManager/localStorage are all browser-only.

// Opt-in, anonymous Web Push (2026-07-19): "Today is <ekadashi>" and "<a
// temple> is live". Zero third-party push service - this talks directly to
// the browser's own Push API using VAPID, the way the standard intends, so
// there is no analytics vendor, no FCM/OneSignal account, and nothing that
// could identify a person. A subscription is just a push endpoint + two
// keys the browser hands back; db/schema.sql's push_subscriptions table
// carries no user id, and RLS there is write-only from this client (see the
// schema comment) - only the sync worker's service key ever reads it, to
// send a push and prune dead endpoints.
//
// Local "subscribed" state follows the lib/data-saver.ts idiom: a plain
// localStorage-backed useSyncExternalStore store, read-only from the
// server snapshot so SSR/first paint never mismatch hydration.
import { useSyncExternalStore } from "react";

import { supabase } from "@/lib/supabase";

// Not a secret - the browser needs this to call pushManager.subscribe(). The
// matching private key lives only in the worker's .env / GitHub Actions
// secrets (never in this repo's committed files) and signs the messages the
// worker sends via pywebpush.
export const VAPID_PUBLIC_KEY =
  "BC9cKcF2PRW8S2QWVqgibwRW6IJ4wig9UI9VXYxjQrkkOuAKQI1ssvM-HYt59dm4r8T87Fv2UuBe2przK-UPxkw";

export type PushTopic = "festivals" | "live";
const ALL_TOPICS: PushTopic[] = ["festivals", "live"];

const STORAGE_KEY = "goloka:push-topics";

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}

/** useSyncExternalStore subscribe: same-tab writes (emit, since a same-tab
 * localStorage write doesn't fire "storage") AND other-tab writes (the real
 * event) - matches lib/data-saver.ts. */
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** Raw JSON snapshot string driving useSyncExternalStore. Never throws:
 * disabled/blocked storage just reads as "not subscribed to anything",
 * same as a first-time visitor. */
function getTopicsSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getTopicsServerSnapshot(): string {
  return "[]";
}

function parseTopics(raw: string): PushTopic[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is PushTopic => ALL_TOPICS.includes(t));
  } catch {
    return [];
  }
}

function persistTopics(topics: PushTopic[]): void {
  try {
    if (topics.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
    emit();
  } catch {
    // ignore - see getTopicsSnapshot.
  }
}

/** The topics this browser is currently subscribed to (empty = not
 * subscribed at all). Reactive - re-renders any component using it the
 * moment subscribeToPush/unsubscribeFromPush changes the state. */
export function usePushTopics(): PushTopic[] {
  const raw = useSyncExternalStore(subscribe, getTopicsSnapshot, getTopicsServerSnapshot);
  return parseTopics(raw);
}

/** True only when every API this feature needs actually exists. iOS Safari
 * (unless installed to the home screen), and any browser with push
 * disabled by policy, fail this - callers show a gentle "unavailable" note
 * rather than a broken toggle. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

/** Notification.permission, or "unsupported" when the API doesn't exist at
 * all - lets the UI tell "you said no" apart from "your browser can't". */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

// Web Push wants the VAPID key as a raw Uint8Array, not the base64url string
// applicationServerKey is normally handed; this is the standard conversion.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type PushResult = { ok: boolean; error?: "unsupported" | "denied" | "no-backend" | "failed" };

/** Subscribes (or updates the topic list for an existing subscription) to
 * the given topics. Only push_subscriptions' granted anon policies exist -
 * INSERT and DELETE, deliberately no UPDATE (see db/schema.sql) - so a
 * topic change is a delete-then-insert of the same endpoint rather than an
 * upsert; both requests are anonymous by design. */
export async function subscribeToPush(topics: PushTopic[]): Promise<PushResult> {
  if (!isPushSupported()) return { ok: false, error: "unsupported" };
  if (!supabase) return { ok: false, error: "no-backend" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "denied" };

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast needed under the current @types/node + lib.dom combination:
        // Uint8Array's `buffer` widens to ArrayBufferLike (which admits
        // SharedArrayBuffer), while the DOM lib's BufferSource wants a
        // concrete ArrayBuffer - the array's actual bytes are fine either
        // way, this is a type-level mismatch only.
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    const endpoint = json.endpoint;
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!endpoint || !p256dh || !auth) return { ok: false, error: "failed" };

    // Best-effort: an endpoint that isn't there yet errors harmlessly.
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    const { error } = await supabase
      .from("push_subscriptions")
      .insert({ endpoint, p256dh, auth, topics });
    if (error) return { ok: false, error: "failed" };

    persistTopics(topics);
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

/** Unsubscribes entirely: cancels the browser's push subscription and
 * deletes the row this browser owns (matched by the endpoint only it
 * knows - see db/schema.sql's RLS comment). Always clears local state, even
 * if the network call fails, so the toggle never gets stuck "on". */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe().catch(() => {});
        if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
    }
  } catch {
    // ignore - state is cleared below regardless.
  } finally {
    persistTopics([]);
  }
}

/** Turns one topic on/off, deriving the full topic list from what's
 * currently stored - what the push-toggle UI calls per switch. Turning the
 * last topic off fully unsubscribes (an empty-topics subscription would
 * just be a silent no-op row). */
export async function setPushTopic(topic: PushTopic, on: boolean): Promise<PushResult> {
  const current = new Set(parseTopics(getTopicsSnapshot()));
  if (on) current.add(topic);
  else current.delete(topic);
  const next = ALL_TOPICS.filter((t) => current.has(t));
  if (next.length === 0) {
    await unsubscribeFromPush();
    return { ok: true };
  }
  return subscribeToPush(next);
}
