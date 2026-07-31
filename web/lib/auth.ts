"use client";

// Client-side auth, deliberately: server components stay anonymous (no
// cookies, no server sessions - shared pages are identical for everyone),
// and the session lives where Supabase puts it (localStorage). Exposed as
// a useSyncExternalStore-compatible store, the codebase's standard pattern
// for browser-only state (see lib/recently-watched.ts).
//
// THE SUPABASE CLIENT IS LOADED DYNAMICALLY, and that is load-bearing.
// @supabase/supabase-js is ~225 kB raw - GoTrue plus a Realtime websocket
// client this app never opens - and the moment AccountControl went into the
// header (2026-07-31) a static import here would put all of it in the shared
// chrome chunk of EVERY route. Measured: it did exactly that, landing 225 kB
// on a 226-element /offline page. A dynamic import moves it off the critical
// path into a chunk fetched after first paint.
//
// Nothing downstream needed changing, because `hydrated` already meant "the
// session is not known yet" - every consumer (AccountControl, AccountRow,
// SaveButtons, LibraryClient, SadhanaClient) renders a neutral state until it
// flips. Deferring the client simply widens that window slightly.
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

let session: Session | null = null;
let hydrated = false;
let started = false;
let clientPromise: Promise<SupabaseClient | null> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** The Supabase client, imported on first use and cached. Null when Supabase
 * is unconfigured, exactly as the static export was. */
function getClient(): Promise<SupabaseClient | null> {
  clientPromise ??= import("@/lib/supabase").then((m) => m.supabase);
  return clientPromise;
}

/** Begins watching auth state. Called from subscribe(), so the SDK is only
 * ever fetched on a page that actually renders something session-aware. */
function start(): void {
  if (started) return;
  started = true;
  void getClient().then((supabase) => {
    if (!supabase) {
      // Unconfigured: nothing will ever arrive, so stop pretending it might.
      hydrated = true;
      emit();
      return;
    }
    // Fires INITIAL_SESSION on subscribe, then SIGNED_IN/SIGNED_OUT/refreshes -
    // one subscription covers hydration and every later change.
    supabase.auth.onAuthStateChange((_event, next) => {
      session = next;
      hydrated = true;
      emit();
    });
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

/** The current session (null while signed out or before hydration). The
 * server snapshot is always null, so SSR and the first client render agree
 * - account UI appears only after mount, never mismatching hydration. */
export function useSession(): { session: Session | null; hydrated: boolean } {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => session,
    () => null
  );
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false
  );
  return { session: snapshot, hydrated: isHydrated };
}

/** Google OAuth (owner decision 2026-07-18: Google only - the free tier's
 * email limits make magic links unreliable). Redirects back to where the
 * user was, so a "save" tap resumes on the same video. Async now only because
 * the client is fetched on demand; by the time anyone can click this, the
 * store has almost always resolved it already. */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await getClient();
  if (!supabase) return;
  void supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href },
  });
}

export async function signOut(): Promise<void> {
  const supabase = await getClient();
  if (!supabase) return;
  void supabase.auth.signOut();
}
