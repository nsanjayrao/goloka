import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

// A devotee who opens a link a friend sent on WhatsApp lands deep in the app
// - on /watch, /series, /channel or /topic - with no way "up" except the
// wordmark, which goes all the way home. This is the one step back: to the
// category the video belongs to, or to Browse.
//
// Server component: it renders a plain link and never needs browser state.
// It deliberately does NOT try to be browser history ("Back" would lie when
// the page was opened cold from a message), so it names a real destination.
export function Breadcrumb({ href, label }: { href: string; label: string }) {
  const t = useTranslations("breadcrumb");

  return (
    <Link
      href={href}
      // py-1 takes the hit area from 20px to 28px: 13px text at line-height
      // 1.55 is 20.15px, under WCAG 2.2's 24px target-size floor (2.5.8).
      // No outline-none - the global flame focus ring is the indicator here;
      // the muted-to-flame colour shift alone measures 1.62:1, well under the
      // 3:1 a focus indicator needs to be perceptible.
      className="group inline-flex items-center gap-1.5 py-1 text-[13px] text-text-muted transition-colors hover:text-flame focus-visible:text-flame"
      aria-label={t("backTo", { label })}
    >
      <span aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none">
        ←
      </span>
      {label}
    </Link>
  );
}
