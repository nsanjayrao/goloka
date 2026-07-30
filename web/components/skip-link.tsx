import { useTranslations } from "next-intl";

// WCAG 2.4.1 Bypass Blocks. Every page opens with the same seven tab stops -
// wordmark, four nav links, More, search pill - and on /watch a keyboard
// devotee had to cross all of them before reaching the player. The header grew
// from two stops to seven in the 2026-07-23 nav rebuild, which is what turned
// a nuisance into a real barrier.
//
// Invisible until focused, then it becomes the first thing on the page. It
// must be the FIRST focusable element in the body, so it is mounted above
// everything else in both root layouts.
//
// Server component - it renders one link and needs no browser state.
export function SkipLink() {
  const t = useTranslations("landmarks");

  return (
    <a
      href="#main"
      className="sr-only rounded-full bg-surface px-4 py-2 text-sm text-text shadow-card focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
    >
      {t("skip")}
    </a>
  );
}
