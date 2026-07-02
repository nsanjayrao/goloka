# Goloka logo concepts

Four mark concepts to replace the placeholder serif "G" in `web/app/icon.svg`.
Each is a standalone, hand-authored SVG at `viewBox="0 0 64 64"` using only the
four approved colors (ivory `#F4F1E8`, saffron `#F0A83C`, peacock teal
`#34B8A5`, dark background `#0B0E1A`). Open `preview.html` in a browser to see
all four at favicon/nav/hero sizes next to the wordmark.

No winner is picked here — that's a product call for the owner.

---

## Concept 1 — Thousand-Petal Lotus

`concept-1-thousand-petal-lotus.svg`

**Scriptural reference**: Brahma-samhita 5.2 describes Goloka/Gokula as
*sahasra-patra-kamalam* — a thousand-petaled lotus, with Krishna's own abode
as the innermost whorl. This is the single most canonical, most directly
named motif available for a Goloka mark.

**Geometry**: One petal (a two-curve almond, `M32,32 Q26,20 32,8 Q38,20 32,32 Z`)
defined once and rotated eight times around the center via `transform="rotate(...)"`
— a literal application of "reduce the thousand petals to geometry, rotate one
shape around a center." A saffron dot sits at the convergence point.

**Rationale**: This is the most direct, least-interpreted translation of the
scripture into a mark. Mathematically regular construction (one path, eight
rotations) reads as considered and premium rather than hand-drawn/organic,
matching "Apple draws a lotus." The center dot is a straightforward echo of
the wordmark's saffron period — same color, same role (a small bright point
anchoring a larger ivory form).

**At 16px**: Holds up well. Eight petals converging on a dot reads at favicon
size as a flower/star-like radial burst — distinct from a generic circle or
blob, and distinct from competitor marks. This is the safest choice for
legibility across all four concepts.

**DESIGN.md §6 / constraint check**: No deity figures, no om symbol, no
clip-art (fully geometric, rotated primitive). No gradients — flat fills
only. Single-color test: rendering the whole mark in ivory alone (dropping
the saffron dot to ivory too) still reads as a lotus/flower; works fine
all-ivory-on-dark.

---

## Concept 2 — Flute-Whorl Lotus

`concept-2-flute-whorl-lotus.svg`

**Scriptural reference**: Same lotus base as Concept 1 (Brahma-samhita 5.2),
combined with the *venu* (Krishna's flute) — specifically its finger-holes,
which are the scripture list's suggested "natural circle/dot motif" for an
abstracted whorl center.

**Geometry**: Identical rotated-petal technique to Concept 1, but the center
is cut away to a negative-space hole (a circle filled in the background
color `#0B0E1A`, sitting on top of the petal bases) rather than a solid dot.
A small saffron dot is placed *off-center* inside that hole, echoing a flute
finger-hole rather than a bullseye center.

**Rationale**: Where Concept 1 is the "safe" canonical lotus, this is the
same flower with a more interesting, less expected center treatment — the
negative space reads as depth/breath (apt for a flute) rather than a static
dot, and the off-axis saffron point is a more playful, less literal echo of
the wordmark's period (the period isn't dead-center either — it trails the
wordmark).

**At 16px — self-critical**: This is the concept I'm least confident about
at favicon size. The negative-space hole is a thin dark ring against a dark
page background in some contexts (e.g. if used on a card with a dark-but-not-
identical surface color) and may lose definition; the off-center saffron dot
is only 3 units of a 64-unit viewBox and could disappear into a single pixel
or vanish entirely at 16px depending on anti-aliasing. **The reviewer should
render this one at actual 16px and judge whether the hole/dot survive — if
not, this concept only works at nav-bar size and larger, not as a true
favicon.**

**DESIGN.md §6 / constraint check**: No deity/om/clip-art, no gradients. The
negative-space circle uses `#0B0E1A` as an intentional cutout fill (allowed
color, used compositionally, not as a stray hex). Single-color test: this
concept depends on the ivory/dark contrast to read as a "hole" — collapsing
to one flat color removes that depth cue, so it degrades to Concept 1's
silhouette with an off-center notch, which is a weaker single-color fallback
than Concept 1's clean dot.

---

## Concept 3 — Peacock-Eye Drops

`concept-3-peacock-eye-drops.svg`

**Scriptural reference**: The peacock feather in Krishna's crown (a
standard, non-anthropomorphic associated motif) — abstracted to just the
feather's "eye," itself reduced further to concentric rings inside a pointed
almond (vesica) outline, per the brief's explicit instruction to avoid a
literal feather.

**Geometry**: An almond/vesica shape from two quadratic arcs (`M32,8
Q52,32 32,56 Q12,32 32,8 Z`) containing three concentric strokes: a teal
ring, an ivory ring, and a saffron center dot.

**Rationale**: This is the only concept that gives peacock teal a real,
intentional role rather than treating it as an afterthought accent color —
appropriate, since teal is otherwise easy to leave unused entirely in a
lotus-only mark. The nested-rings-in-an-almond shape is unusual enough to be
memorable and distinctly "eye"-like without drawing a literal feather or
face. The saffron center dot again echoes the wordmark's period.

**At 16px — self-critical**: Risk here is stroke count: three concentric
strokes plus an outer outline is four line-weights nested inside a 64-unit
box, which is a lot of detail to survive shrinking to 16px. It may compress
into a soft dark smear or lose the outer almond entirely, reading as a plain
dot. Stroke widths were kept relatively heavy (2–2.5 units) specifically to
mitigate this, but this concept should be checked at real favicon size
before being considered viable as-is; it may need to drop a ring for small
sizes (e.g. a simplified two-ring favicon variant) if kept.

**DESIGN.md §6 / constraint check**: No deity/om/clip-art (no feather
barbs, no bird silhouette — eye motif only). No gradients — all strokes are
flat single-color. Single-color test: collapsing all strokes to one ivory
color still reads as a target/eye shape and holds up reasonably (the teal
ring becomes just another ring), so the fallback is acceptable even though
the multicolor version is the more distinctive one.

---

## Concept 4 — Cintamani Facet

`concept-4-cintamani-facet.svg`

**Scriptural reference**: Cintamani-dhama — the ground of Goloka is
described as made of touchstone/wish-fulfilling gems (cintamani). This is
the brief's "own idea from the scripture list" option: a faceted gem shape
rather than another lotus variant, giving real visual variety among the four
concepts.

**Geometry**: A regular hexagon (six vertices at equal radius from center,
computed by rotating a point, not hand-drawn) filled saffron as the gem
body; six straight facet-divider lines from center to each vertex; one
facet wedge recolored teal as a rare highlight/glint; an ivory dot at the
exact center as the gem's point of light.

**Rationale**: This is the concept furthest from "another lotus," which is
valuable — if the owner wants the four options to feel meaningfully
different rather than four lotus variations, this is the one that provides
contrast. A faceted gem also reads as premium/jewel-like, which fits the
"premium streaming app" half of the brand brief distinctly from the
"serene devotional" half that the lotus concepts lean into. The echo of the
wordmark's period is more structural than literal here: the whole mark is a
single solid-colored form (like the dot itself, just larger and faceted)
rather than containing a dedicated saffron dot — worth flagging as a
deliberate deviation from the other three concepts' more literal echo.

**At 16px**: Holds up the best of all four concepts, honestly. A hexagon
with one shaded facet reads clearly even at very small sizes because it has
no thin strokes and no fine negative space — it's built entirely from flat
fills and a handful of straight lines. The facet-divider lines (drawn in
`#0B0E1A`) are the one part that may thin out to invisible at 16px, in which
case it degrades gracefully to a plain saffron hexagon with a teal corner
and ivory center dot — still legible, still on-brand.

**DESIGN.md §6 / constraint check**: No deity/om/clip-art (pure geometric
hexagon, no literal gem illustration with sparkle lines/cut realism). No
gradients — three flat fills plus flat-color divider strokes. Single-color
test, corrected: unlike Concepts 1–3, this mark's internal detail is drawn
as color-contrast on one unbroken fill region rather than as gaps/negative
space, so a true single-color render (every element forced to one flat
value) loses the facet-divider lines entirely, not just the teal/ivory
accents — it degrades to a plain hexagon with a center dot. Still legible
and on-brand in that state, but the "faceted gem" character is lost, which
is a bigger reduction than the other three concepts see.

---

## Cross-concept notes

- All four concepts fit inside the maskable-icon safe zone: no path point
  exceeds roughly radius 24–25 units from the center (32,32) in a 64-unit
  viewBox, leaving margin inside the ~25.6-unit (80%) safe circle even after
  stroke widths are accounted for.
- All four are roughly square/circular in their bounding shape, not wide
  horizontal lockups, so all sit comfortably to the left of the "Goloka."
  wordmark as a single glyph-like unit (see `preview.html` lockup rows).
- Concepts 1 and 2 share a base petal-rotation technique deliberately — they
  are meant to be compared as "safe lotus" vs. "lotus with a twist," not as
  fully independent design directions.
- My honest ranking of small-size (16px) legibility, most to least robust:
  Concept 4 (cintamani) ≈ Concept 1 (thousand-petal) > Concept 3 (peacock-eye)
  > Concept 2 (flute-whorl). This is a legibility ranking only, not a
  recommendation — narrative fit, teal usage, and how "premium" vs. "devotional"
  the owner wants to lean are all separate, non-technical calls.
