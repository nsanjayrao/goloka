"use client"; // per-user state (is this video saved?) can only exist in
// the browser - the server renders neutral, unsaved buttons.

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Diya } from "@/components/icons/diya";
import { signInWithGoogle, useSession } from "@/lib/auth";
import { getSavedKinds, toggleSaved, type SavedKind } from "@/lib/saved";
import { cn } from "@/lib/utils";

// The watch page's save actions: heart = favourite, bookmark = watch
// later. Signed out, a tap starts Google sign-in and returns to this very
// page (lib/auth.ts redirectTo) - sign-in only ever appears when asked
// for. Toggles are optimistic with rollback on error.
const EMPTY: Set<SavedKind> = new Set();

export function SaveButtons({ youtubeVideoId }: { youtubeVideoId: string }) {
  const { session } = useSession();
  const [fetched, setFetched] = useState<Set<SavedKind>>(EMPTY);
  const t = useTranslations("buttons");

  useEffect(() => {
    if (!session) return; // signed out: `saved` below derives to empty
    let cancelled = false;
    getSavedKinds(youtubeVideoId).then((kinds) => {
      if (!cancelled) setFetched(kinds);
    });
    return () => {
      cancelled = true;
    };
  }, [session, youtubeVideoId]);

  // Derived, not reset-in-effect: stale fetches from a previous session are
  // ignored the moment the session is gone (react-hooks/set-state-in-effect).
  const saved = session ? fetched : EMPTY;

  async function onToggle(kind: SavedKind) {
    if (!session) {
      signInWithGoogle();
      return;
    }
    const on = !saved.has(kind);
    // Optimistic flip, rolled back if the write fails.
    setFetched((prev) => {
      const next = new Set(prev);
      if (on) next.add(kind);
      else next.delete(kind);
      return next;
    });
    const result = await toggleSaved(session.user.id, youtubeVideoId, kind, on);
    if (result === null) {
      setFetched((prev) => {
        const next = new Set(prev);
        if (on) next.delete(kind);
        else next.add(kind);
        return next;
      });
    }
  }

  // Favouriting lights a lamp; watch-later stays a bookmark. They are
  // genuinely different acts - one is an offering, the other is "not now" -
  // and giving them the same shape was flattening that.
  // signInLabel INTERPOLATES the visible label rather than replacing it.
  // WCAG 2.5.3 (Label in Name): the accessible name must contain the visible
  // text, so a speech-input user saying "Watch later" can still activate the
  // button. "Sign in to save this for later" did not contain "Watch later" -
  // introduced while fixing the aria-pressed lie, and caught by Lighthouse's
  // label-content-name-mismatch audit.
  const buttons: { kind: SavedKind; label: string; onLabel: string; signInLabel: string }[] = [
    {
      kind: "favourite",
      label: t("favourite"),
      onLabel: t("favourited"),
      signInLabel: t("signInTo", { label: t("favourite") }),
    },
    {
      kind: "watch_later",
      label: t("watchLater"),
      onLabel: t("saved"),
      signInLabel: t("signInTo", { label: t("watchLater") }),
    },
  ];

  return (
    <>
      {buttons.map(({ kind, label, onLabel, signInLabel }) => {
        const active = saved.has(kind);
        return (
          <button
            key={kind}
            type="button"
            // Signed out, this button does not toggle anything - it starts a
            // full-page redirect to Google. aria-pressed promises in-place
            // state, so announcing "Favourite, toggle button, not pressed"
            // and then navigating off-site is a lie. Drop the state and say
            // what actually happens instead.
            aria-pressed={session ? active : undefined}
            aria-label={session ? undefined : signInLabel}
            onClick={() => onToggle(kind)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "border-accent/50 text-flame"
                : "border-border text-text-muted hover:border-hairline hover:text-text"
            )}
          >
            {kind === "favourite" ? (
              // Once lit it breathes on prāṇa (6.5s) and simply stays lit -
              // no burst, no confetti, nothing that congratulates you.
              <Diya lit={active} className={cn("size-4", active && "diya lit")} />
            ) : (
              <Bookmark className={cn("size-3.5", active && "fill-current")} />
            )}
            {active ? onLabel : label}
          </button>
        );
      })}
    </>
  );
}
