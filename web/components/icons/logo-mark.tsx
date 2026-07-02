// The Goloka mark: thousand-petal lotus (Brahma-samhita 5.2,
// sahasra-patra-kamalam). One petal path rotated 8x around a saffron center
// dot. Inline SVG (no external request) - pairs with the "Goloka." wordmark
// in the top-bar lockup (DESIGN.md #6) and is also the source for the
// favicon / PWA icons (web/app/icon.svg, web/public/icons/icon.svg), which
// hardcode the colors since those always sit on a fixed dark tile.
//
// Here the petals use `currentColor` (so wrap with e.g. `text-text` to track
// the light/dark theme, same convention as the lucide icons elsewhere in
// this codebase) and the center dot uses the `accent` token directly, since
// it should stay saffron in both themes.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <path id="logo-mark-petal" d="M32,32 Q26,20 32,8 Q38,20 32,32 Z" />
      </defs>
      <g fill="currentColor">
        <use href="#logo-mark-petal" />
        <use href="#logo-mark-petal" transform="rotate(45 32 32)" />
        <use href="#logo-mark-petal" transform="rotate(90 32 32)" />
        <use href="#logo-mark-petal" transform="rotate(135 32 32)" />
        <use href="#logo-mark-petal" transform="rotate(180 32 32)" />
        <use href="#logo-mark-petal" transform="rotate(225 32 32)" />
        <use href="#logo-mark-petal" transform="rotate(270 32 32)" />
        <use href="#logo-mark-petal" transform="rotate(315 32 32)" />
      </g>
      <circle cx="32" cy="32" r="5" className="fill-accent" />
    </svg>
  );
}
