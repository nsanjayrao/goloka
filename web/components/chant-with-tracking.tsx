"use client"; // reads the sign-in session and records rounds to the cloud -
// both are browser-only. A thin wrapper so ChantSpace itself stays entirely
// free of any auth/tracking coupling (it only ever fires onRoundComplete and
// renders whatever session-aware line is passed into sadhanaSlot).

import { useTranslations } from "next-intl";

import { ChantSpace } from "@/components/chant-space";
import { Link } from "@/i18n/navigation";
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
//
// The sadhanaSlot closes a feedback gap: rounds used to flow into the
// journal silently, with nothing telling the devotee they were being kept,
// nor any path from chanting to the record. One muted link, only when
// signed in - never an upsell when signed out.
export function ChantWithTracking() {
  const { session } = useSession();
  const t = useTranslations("pages.chant");
  return (
    <ChantSpace
      onRoundComplete={(mantraId) => {
        // The mantra's own id rides along, so the journal keeps Śrī Rādhā
        // rounds as Śrī Rādhā rounds (the dashboard shows the split).
        if (session) void recordRound(session.user.id, mantraId);
      }}
      sadhanaSlot={
        session ? (
          <Link
            href="/sadhana"
            className="text-[11px] normal-case tracking-normal text-text-muted underline-offset-4 transition-colors hover:text-flame focus-visible:text-flame"
          >
            {t("recordedInSadhana")} →
          </Link>
        ) : undefined
      }
    />
  );
}
