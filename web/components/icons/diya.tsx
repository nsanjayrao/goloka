// A lamp, drawn rather than borrowed (DESIGN.md #5.8: our icons, never an
// icon library, for anything that carries meaning).
//
// This replaces the heart on the watch page. A heart that fills in is the
// vocabulary of a feed - it says "I liked this". Lighting a lamp before
// something is the vocabulary of a temple: it says "I offered attention
// here", and the lamp stays lit afterwards, which is why the Library reads
// as a room of lamps a devotee has lit rather than a list of saved items.
export function Diya({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      {/* The flame. Filled and warm once lit; a bare outline before.
          The lit/unlit difference is expressed in CSS opacity rather than by
          swapping the fill and stroke ATTRIBUTES: React replaces attributes in
          a single commit and nothing interpolates, so the flame used to pop
          into existence while the surrounding button eased its border and
          label over 250ms. Now it kindles. (The global reduced-motion rule
          kills the transition, leaving the same two end states.) */}
      <path
        d="M8 1.6c1.9 2.1 2.9 3.6 2.9 5a2.9 2.9 0 1 1-5.8 0c0-1.4 1-2.9 2.9-5z"
        className="diya-flame"
        // --flame-ink, falling back to marigold: this is the app's signature
        // piece of gold artwork, and raw marigold measures 1.97:1 on Aruṇa's
        // candana ground - it would wash out entirely if that theme were ever
        // switched on. Every other gold ornament (§5.8) already deepens via
        // --gold-ink there; the diya was the one that didn't.
        fill="var(--flame-ink, var(--marigold))"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* The bowl of the diya - always drawn, because the lamp exists
          whether or not it is burning. */}
      <path
        d="M2.2 11.4h11.6c-.5 2-2.7 3.2-5.8 3.2s-5.3-1.2-5.8-3.2z"
        fill={lit ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
