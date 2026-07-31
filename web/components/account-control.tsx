"use client"; // the session lives in the browser (lib/auth.ts).

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { signInWithGoogle, useSession } from "@/lib/auth";

// The account affordance the header never had (2026-07-31).
//
// Before this, auth existed ONLY inside /library, /sadhana and the watch
// page's save buttons - so a devotee could not sign in from anywhere global,
// could not sign out except from two specific pages, and could not tell
// whether they were signed in at all. A returning devotee had no path back to
// their own library.
//
// It is deliberately NOT a marketing "Sign up" call-to-action. It reads as
// chrome, in the same pill idiom as the search control beside it, because
// DESIGN.md §9's restraint applies here too: the account is offered, never
// sold. What it must be is ALWAYS PRESENT and always honest about state.
export function AccountControl() {
  const t = useTranslations("account");
  const { session, hydrated } = useSession();

  // Hold the box before the session resolves. The header is fixed and sits
  // above the hero, so a control appearing late would shove the search pill
  // sideways on every single page load - the same reservation the Vrindavan
  // hour needed, for the same reason.
  if (!hydrated) return <span className="account-slot" aria-hidden="true" />;

  if (!session) {
    return (
      <button type="button" className="account-slot account-signin" onClick={signInWithGoogle}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.8 20c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6" />
        </svg>
        <span className="account-label">{t("signIn")}</span>
      </button>
    );
  }

  const meta = session.user.user_metadata as { full_name?: string; name?: string } | undefined;
  const name = (meta?.full_name ?? meta?.name ?? session.user.email ?? "").trim();
  // An initial, not the Google avatar: it costs no third-party request on
  // every page, cannot fail to load, and cannot shift the header.
  const initial = (name[0] ?? "•").toUpperCase();

  return (
    <Link
      href="/library"
      className="account-slot account-avatar"
      aria-label={name ? t("signedInAs", { name }) : t("myLibrary")}
    >
      <span aria-hidden="true">{initial}</span>
    </Link>
  );
}
