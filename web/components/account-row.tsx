"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { signInWithGoogle, signOut, useSession } from "@/lib/auth";

// The account, stated plainly, at the foot of the More sheet - the one
// surface reachable from every page at every width. The header's
// AccountControl can offer sign-IN; this is where signing OUT lives, and
// where a devotee can see which account they are actually in.
//
// It says what the account DOES rather than asking to be joined. That is the
// honest pitch while the account is still two lists and a japa count: over-
// selling a thin account is how a product loses trust in its first minute.
export function AccountRow({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("account");
  const { session, hydrated } = useSession();

  // Nothing at all until the session is known - a row that flips from
  // "Sign in" to a name would be worse than a row that arrives once.
  if (!hydrated) return null;

  if (!session) {
    return (
      <div className="account-row">
        <p className="account-row-why">{t("why")}</p>
        <button type="button" className="btn gold w-full" onClick={signInWithGoogle}>
          {t("continueWithGoogle")}
        </button>
        <p className="account-row-fine">{t("privacyNote")}</p>
      </div>
    );
  }

  const meta = session.user.user_metadata as { full_name?: string; name?: string } | undefined;
  const name = (meta?.full_name ?? meta?.name ?? "").trim();
  const email = session.user.email ?? "";

  return (
    <div className="account-row">
      <div className="account-who">
        <span className="account-who-name">{name || email}</span>
        {name && email && <span className="account-who-mail">{email}</span>}
      </div>
      <div className="account-row-actions">
        <Link href="/library" className="more-link" onClick={onNavigate}>
          {t("myLibrary")}
        </Link>
        <button type="button" className="more-link account-signout" onClick={signOut}>
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}
