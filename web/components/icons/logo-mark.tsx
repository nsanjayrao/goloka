// The Goloka mark: the thousand-petal lotus of Goloka (Brahma-samhita 5.2,
// sahasra-patra-kamalam), "Concept A - Thousand-Petal Bloom" (owner-approved
// 2026-07-04, see the logo study artifact). The design is derived from
// scripture:
//   - TWO offset rings of petals (an outer ring of 8 broad petals + an inner
//     ring of 8 shorter petals rotated 22.5 between them) suggest the
//     "thousand petals" through layered depth rather than a literal count;
//   - a six-sided saffron pericarp (polygon) is the hexagonal seat of Krishna
//     (sat-kona) at the whorl of the lotus;
//   - the gold, lit-from-within gradient is the self-effulgence of the abode
//     (Bhagavad-gita 15.6, "na tad bhasayate suryo").
//
// Fixed gold palette (NOT currentColor): the mark is a self-effulgent gold
// emblem that reads on both the black top bar and the white page/footer, so it
// no longer needs `text-*` to tint it (the `text-text` some callers still pass
// is simply inert). The two ring gradients + saffron centre are mirrored with
// the same colours in web/app/icon.svg and web/public/icons/icon.svg - if this
// geometry or palette changes, update both SVGs and re-run
// scripts/generate-icons.mjs.
//
// NOTE ON IDS: like the previous mark, the gradient/path ids are stable
// strings, so several <LogoMark>s on one page emit duplicate ids. Browsers
// resolve every `url(#id)` to the first match, and all instances are identical
// and static, so they render the same - matching the codebase's prior pattern.
const OUTER_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const INNER_ANGLES = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];

export function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="lotus-gold-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4cf78" />
          <stop offset="1" stopColor="#a86d1c" />
        </linearGradient>
        <linearGradient id="lotus-gold-lite" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdeec4" />
          <stop offset="1" stopColor="#e0b055" />
        </linearGradient>
        <radialGradient id="lotus-saffron" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0" stopColor="#ffc25a" />
          <stop offset="1" stopColor="#e2761b" />
        </radialGradient>
        <path id="lotus-petal-outer" d="M32 32 C 25 23, 25 12, 32 5 C 39 12, 39 23, 32 32 Z" />
        <path id="lotus-petal-inner" d="M32 32 C 28.4 27, 28.4 19, 32 14 C 35.6 19, 35.6 27, 32 32 Z" />
      </defs>

      {/* Outer ring: 8 broad petals, deep gold. */}
      <g fill="url(#lotus-gold-deep)">
        {OUTER_ANGLES.map((angle) => (
          <use key={angle} href="#lotus-petal-outer" transform={`rotate(${angle} 32 32)`} />
        ))}
      </g>

      {/* Inner ring: 8 shorter petals offset by 22.5, lighter gold - the layer
          that reads as depth / "the thousand". */}
      <g fill="url(#lotus-gold-lite)">
        {INNER_ANGLES.map((angle) => (
          <use key={angle} href="#lotus-petal-inner" transform={`rotate(${angle} 32 32)`} />
        ))}
      </g>

      {/* Hexagonal saffron pericarp - the seat of Krishna - with a cream dot. */}
      <polygon points="32,26.4 36.85,29.2 36.85,34.8 32,37.6 27.15,34.8 27.15,29.2" fill="url(#lotus-saffron)" />
      <circle cx="32" cy="32" r="1.7" fill="#fff3d6" />
    </svg>
  );
}
