// Home used to be fourteen stacked sections of near-identical shape - hero,
// live, calendar, observances, doorways, three personalised shelves, arrivals,
// festival, split, quote, topic rows, categories, most-watched - with nothing
// to orient by. A devotee scrolling had no idea where they were or how much
// was left.
//
// A movement groups those sections into the three things the page actually
// does: what is happening today, what is yours, and the catalogue. The marker
// is deliberately the quietest thing that can still work as a landmark - a
// small uppercase label and a hairline that fades out. DESIGN.md #9 is
// explicit that Her mood is restraint, so this adds structure, not ornament:
// no display type, no icon, no rule across the full width.
//
// Server component - it renders a heading and passes children straight
// through (the RSC children-as-props pattern the rest of the app uses).
export function Movement({ label, children }: { label: string; children: React.ReactNode }) {
  // aria-labelledby, NOT aria-label. The label is already on screen, so
  // aria-label duplicated it: a screen reader announced "Today at the temple,
  // region" and then read "Today at the temple" again as the section's first
  // content. Pointing at the visible element names the region once, and keeps
  // the accessible name and the visible text from ever drifting apart.
  // The id is derived from the label rather than useId() so this stays a
  // server component - three movements, three stable distinct ids.
  const labelId = `movement-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

  return (
    <section className="movement" aria-labelledby={labelId}>
      <div className="movement-head gutter">
        <span className="movement-label" id={labelId}>
          {label}
        </span>
        <span className="movement-rule" aria-hidden="true" />
      </div>
      {/* The body wrapper exists so the spacing rule in globals.css can key
          off a class we control instead of sibling order. It previously used
          `.movement-head + *`, which silently stopped matching the moment
          VrindavanHour mounted and became the new adjacent sibling - the
          movement then reverted to full section padding and sat permanently
          out of step with the other two. */}
      <div className="movement-body">{children}</div>
    </section>
  );
}
