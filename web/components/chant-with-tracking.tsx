"use client"; // reads the sign-in session and records rounds to the cloud -
// both are browser-only. A thin wrapper so ChantSpace itself stays entirely
// free of any auth/tracking coupling (it only ever fires onRoundComplete).

import { ChantSpace } from "@/components/chant-space";
import { useSession } from "@/lib/auth";
import { recordRound } from "@/lib/japa-tracking";

// Wires the still chant space to the OPTIONAL sādhana record: when a devotee
// is signed in, each completed round is also written to their own japa
// record (web/lib/japa-tracking.ts), which the /sadhana dashboard reads back
// as today / this month / this year. Signed OUT, this does nothing - rounds
// stay on-device (web/lib/rounds.ts), private and ephemeral, exactly as
// before signing in was ever offered. recordRound is defensive (no-ops
// without a real user id, never throws), so a failed write can never disturb
// the chanting itself.
export function ChantWithTracking() {
  const { session } = useSession();
  return (
    <ChantSpace
      onRoundComplete={() => {
        if (session) void recordRound(session.user.id);
      }}
    />
  );
}
