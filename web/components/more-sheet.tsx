"use client"; // opening/closing a dialog and closing it again after a
// client-side navigation both need browser state.

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { AccountRow } from "@/components/account-row";
import { Link, usePathname } from "@/i18n/navigation";

// Everything that used to be reachable only from the footer (or, on a phone,
// not at all - the header hides every nav link under 600px and the tab bar
// had no room). One list, used by BOTH the desktop "More" trigger and the
// mobile tab bar's fifth tab, so the two can never drift apart.
//
// Calendar is deliberately NOT here: it is one of the header's four primary
// links. Listing it in both made it the single duplicated destination in the
// whole nav, so on /calendar the Calendar link AND the More trigger both
// claimed "you are here" - two gold underlines, and two aria-current="page"
// markers announced on one screen. Every href below must be absent from
// PRIMARY_LINKS in top-bar.tsx.
const MORE_LINKS = [
  { href: "/start", key: "start" },
  { href: "/sadhana", key: "sadhana" },
  { href: "/leaders", key: "leaders" },
  { href: "/books", key: "books" },
  { href: "/temples", key: "temples" },
  { href: "/about", key: "about" },
] as const;

/** The routes this sheet owns - the top bar asks so it can light up its
 * "More" trigger when you're on one of them. */
export const MORE_HREFS: readonly string[] = MORE_LINKS.map((link) => link.href);

export function MoreSheet({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const tSheet = useTranslations("moreSheet");
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  // useId, because this component mounts TWICE (header trigger + mobile tab),
  // so a hard-coded id would collide and aria-labelledby would resolve to
  // whichever came first in the document.
  const titleId = useId();
  // Mirrors the dialog's own open/closed state into React. The <dialog>
  // element handles Escape and the backdrop itself WITHOUT telling React, so
  // `onClose` is the only reliable way to learn it shut - without it the
  // trigger would keep claiming aria-expanded="true" after an Escape.
  const [open, setOpen] = useState(false);

  // A native <dialog> opened with showModal() gives us the things a
  // hand-rolled overlay always gets wrong: focus moves into the panel and is
  // trapped there, Escape closes it, and the rest of the page is inert for
  // screen readers. We only have to add "click the backdrop to close".
  // Belt and braces. The per-link onClick below is what actually closes the
  // sheet; this catches any other route change (a browser Back out of the
  // sheet, say). It cannot be the only mechanism, because every destination in
  // MORE_LINKS is reachable FROM itself: tapping "About" while already on
  // /about leaves pathname unchanged, so this effect never re-runs and the
  // sheet just sits there - the devotee taps a link and nothing happens.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className={className}
        // Without these a screen reader hears only "More, button" and has no
        // idea it opens a dialog - on the mobile tab bar it reads as a fifth
        // destination sitting in a row of four links.
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        {children}
      </button>

      <dialog
        ref={dialog}
        // Named by the visible <h2>, not by a separate aria-label. The label
        // said "More pages" while the heading on screen said "More" - two
        // different names for one thing, and the one nobody could see won.
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="more-sheet"
        // The dialog element itself fills the viewport; its backdrop is the
        // ::backdrop pseudo-element. A click that lands on the dialog rather
        // than on the inner panel is a backdrop click.
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="more-panel">
          <div className="more-head">
            <h2 id={titleId} className="font-heading text-[22px] text-text">
              {tSheet("title")}
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={tSheet("close")}
              className="more-close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav className="more-links">
            {MORE_LINKS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                onClick={() => dialog.current?.close()}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                className="more-link"
              >
                {t(key)}
              </Link>
            ))}
          </nav>

          {/* The account, at the foot of the one sheet reachable from every
              page on every screen size. The header control can offer sign-IN,
              but sign-out needs somewhere to live that isn't buried inside
              /library or /sadhana - which is exactly where it was. */}
          <AccountRow onNavigate={() => dialog.current?.close()} />
        </div>
      </dialog>
    </>
  );
}
