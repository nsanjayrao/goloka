"use client";

// Client-side auth, deliberately: server components stay anonymous (no
// cookies, no server sessions - shared pages are identical for everyone),
// and the session lives where Supabase puts it (localStorage). Exposed as
// a useSyncExternalStore-compatible store, the codebase's standard pattern
// for browser-only state (see lib/recently-watched.ts).
import type { Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

import { supabase } from "@/lib/supabase";

let session: Session | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

if (supabase) {
  // Fires INITIAL_SESSION on subscribe, then SIGNED_IN/SIGNED_OUT/refreshes -
  // one subscription covers hydration and every later change.
  supabase.auth.onAuthStateChange((_event, next) => {
    session = next;
    hydrated = true;
    emit();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
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
 * user was, so a "save" tap resumes on the same video. */
export function signInWithGoogle(): void {
  if (!supabase) return;
  void supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.href },
  });
}

export function signOut(): void {
  if (!supabase) return;
  void supabase.auth.signOut();
}
