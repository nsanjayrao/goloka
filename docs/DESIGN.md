# Goloka — UI Design Brief (Midnight redesign, 2026-07-12)

This is the binding design spec for all frontend work. The code-reviewer
flags deviations. The approved reference implementation is
`goloka-final.html` in the repo root — a working single-file prototype.
**The prototype is the source of truth for all visual decisions**; where
this document and the prototype conflict, the prototype wins, except for
the Known Defects in §8 (which override the prototype).

Identity: a temple at dusk. Deep śyāma-indigo night sky, a living gold
lamp, serif Devanagari-friendly type. Cinematic and devotional — never
generic-SaaS, never cluttered like YouTube. This replaces the light
warm-ivory system (2026-07-05); the app is dark-only, no theme toggle.

## 1. Design principles

1. **Content is sacred; chrome is silent.** Thumbnails, titles, and the
   player dominate. Gold is an accent — hairlines, small text, icons,
   one solid button per view. Large marigold fills are forbidden.
2. **The page is night, not black.** The canvas is `--midnight` #0A0F26
   (deep indigo), never #000. Surfaces are raised indigos, borders are
   gold hairlines at low alpha.
3. **Motion is warm and alive, but optional.** The lamp breathes, embers
   drift, sections rise. Every animation is disabled under
   `prefers-reduced-motion` with content fully visible.
4. **Fast is a feature.** next/image everywhere, next/font (zero layout
   shift), `content-visibility:auto` below the fold, no animation
   libraries for the signature elements (vanilla CSS/JS/canvas).
5. **Mobile still matters.** Rows become 72vw cards under 600px, the
   split layout stacks at 820px, nav links collapse leaving the search
   pill. The bottom tab bar stays (restyled midnight) — the prototype is
   a desktop mock and doesn't supersede mobile nav.

## 2. Color tokens (exact values — do not shift)

Defined in `web/app/globals.css` `:root` + `@theme`; change values there,
never inline.

- `--midnight`  #0A0F26              page background (deep śyāma indigo)
- `--shyama`    #131A3E              surface (cards, raised bands)
- `--shyama-2`  #1A2350              raised surface (hover, skeletons)
- `--marigold`  #E8A33D              primary accent
- `--flame`     #F5C97B              highlight / glow / hover / focus rings
- `--lotus`     #D9A0B0              rare secondary accent
- `--chandan`   #F3EDDF              primary text
- `--muted`     #9AA3C7              secondary text, metadata
- `--hairline`  rgba(232,163,61,.22) gold hairline borders
- live red      #E05B5B              live dot/badge only (viewer counts
                                     use #E58A8A on dark surfaces)

Semantic aliases (so app code stays palette-agnostic): `--bg`=midnight,
`--surface`=shyama, `--surface-2`=shyama-2, `--text`=chandan,
`--text-muted`=muted, `--accent`=marigold, `--accent-hover`=flame,
`--accent-strong`=flame, `--accent-ink`=midnight (text on gold fills),
`--border`=rgba(243,237,223,.08) (neutral hairline; use `--hairline` for
the gold one). Contrast: chandan on midnight ≈ 15:1, muted ≈ 7:1,
marigold ≈ 8:1 — all clear AA for small text on the dark canvas.

## 3. Typography

Google Fonts via `next/font` (self-hosted at build, zero layout shift):

- **Display: Marcellus** (single weight 400) — hero title, section
  titles, quotes, the wordmark, category card titles, watch-page title.
- **Body/UI: Figtree** (400/500/600) — everything else.
- **Devanagari fallback: Tiro Devanagari Hindi** — in the stack of BOTH
  families, so Hindi titles render as elegant serif, never system
  fallback.

Scale (from the prototype): hero h1 `clamp(30px,5.2vw,62px)` lh 1.13;
section h2 `clamp(22px,2.6vw,32px)`; quote `clamp(24px,3.4vw,42px)`;
card title 15px/500; meta 13px muted; kickers/eyebrows 12-13px uppercase
with .22-.24em tracking.

## 4. Layout & rhythm

- One shared gutter: `--pad: clamp(20px,4vw,56px)`. **Every** full-bleed
  section (hero, live strip, rows, split, quote, categories, footer)
  uses the same `--pad` left/right — the §8 alignment audit checks this.
- Radii: video cards/thumbs 14px, feature card 18px, category cards
  16px, live/mini cards 14px, buttons/pills 999px.
- Easing: `cubic-bezier(.2,.7,.2,1)` (exposed as `--ease-spring`) for
  lifts/reveals; the play button pops with `cubic-bezier(.2,.7,.3,1.4)`.
- Section rhythm is VARIED, never flattened: horizontal snap rows →
  feature split (one large card + stacked minis) → centered quote
  interlude → category grid → more rows.
- Section headings: small uppercase kicker on its own line ABOVE the
  Marcellus title (never beside it), gold ❋ mark before the title,
  "View all →" baseline-aligned right.

## 5. Signature elements (all in the prototype — copy, don't reinvent)

1. **Darshan curtain preloader** — two indigo panels part from a glowing
   gold seam. First visit per session only (sessionStorage), auto-opens
   ≤2.6s even if load stalls, removes itself from the DOM, skipped
   under reduced motion.
2. **Living āratī lamp** — breathing/flickering radial gold glow behind
   the hero (pure CSS, keyframes verbatim); low-intensity variant behind
   the watch-page player and in the footer.
3. **Diya embers** — hero canvas particles (~42 desktop / ~22 mobile),
   requestAnimationFrame with unmount cancel, off under reduced motion.
4. **Time-aware temple period** — hero eyebrow from local hour:
   Maṅgala-ārati 4–8, Śṛṅgāra-darśana 8–12, Rāja-bhoga 12–16,
   Sandhyā-ārati 16–21, else Śayana. Server renders a sensible default;
   client corrects after mount (no hydration mismatch).
5. **Rotating hero** — 3 featured items (real data: `featured` flag,
   falling back to newest), 8s each, thin gold progress bars that fill
   like incense, clickable, pause on hover, 500ms crossfade.
6. **Live from the dhāma strip** — pulsing red dot label, live cards
   (thumb + temple/title/viewers). Renders only when live data exists.
7. **Rows** — horizontal scroll, `--pad`-wide edge-fade masks, snap,
   desktop hover paddle arrows (real buttons, keyboard reachable),
   staggered rise-in reveal via one IntersectionObserver.
8. **Category cards** — custom gold line SVG icons copied exactly from
   the prototype (scripture, diya, mridanga, ॐ in Marcellus, peacock
   feather, prasadam bowl). Never emoji, never an icon library.
9. **Card hover** — thumb lifts 4px + gold hairline ring, marigold play
   button scales in, title turns flame, image zooms 1.045. Duration chip
   bottom-right; LIVE badge top-left.
10. **Footer** — mahā-mantra in letter-spaced gold Marcellus, faint lamp
    glow, the existing "index, not a host" disclaimer preserved.
11. **Film grain** — fixed overlay, opacity .045, `steps(8)` shift; and
    the glassy header: transparent gradient at top, blur + gold hairline
    after 40px scroll.

## 6. App shell & pages

- **Header**: fixed, wordmark (Thousand-Petal Lotus mark + "Goloka" in
  Marcellus — the lotus stays; owner brand decision supersedes the
  prototype's plain bindu dot), uppercase nav, search pill → /search.
- **Watch page**: player on midnight, title in Marcellus, related videos
  as one row, lamp glow behind the player at low intensity.
- **Browse/search/topic/channel/leaders/about**: same tokens, header,
  footer, card components; grids of the same `.card` language.
- **Empty states / skeletons**: shyama surfaces, muted text — never
  white flashes.
- PWA: `themeColor` #0A0F26; manifest colors match.

## 7. Architecture rules

- Server components for all content; client islands ONLY for: curtain,
  embers, hero rotation, āratī period, scroll reveals, row arrows,
  header scroll state, and existing localStorage personalization. Keep
  each tiny; pass server-rendered content through as `children`.
- All Supabase reads stay in `web/lib/data.ts` behind `safely()`;
  queries bounded; pages render gracefully on an empty/unreachable DB.
- Images: next/image; thumbs `i.ytimg.com/vi/{id}/hqdefault.jpg`, hero
  `maxresdefault` with `hqdefault` fallback; hero image priority-loaded;
  lazy below the fold.
- No new animation dependencies. (framer-motion is already installed but
  the signature elements use vanilla CSS/JS per the prototype.)
- Keyboard: visible flame focus rings everywhere; one h1 per page; alt
  text on thumbnails; aria-labels on rows/arrows/progress bars.
- Lighthouse mobile targets: Performance ≥ 90, Accessibility ≥ 95,
  CLS < 0.05.

## 8. Known defects & alignment rules (override the prototype)

1. Category cells never narrower than 200px; titles/descriptions wrap
   fully (`overflow-wrap:break-word`), never clip; the ॐ icon is not
   clipped by its 34px box.
2. Kicker sits ABOVE the serif title on its own line, never beside it.
3. Live-card text column has `min-width:0` so long titles ellipsis.
4. Alignment audit after every phase: shared `--pad` gutters across ALL
   sections; thumbnails vertically centered vs text in live/mini cards;
   equal heights across the three minis; section title ↔ "View all"
   baseline-aligned; no truncation except intentional 2-line clamps on
   card titles, which must carry a `title` attribute with the full text.
5. Block content inside cards uses `<div>`/semantic elements, not
   `<span>` wrappers (prototype's spans were a defect).
6. Any further misalignment/overflow/clipping found during a port is
   fixed and listed in the deviation report — visual bugs are never
   preserved in the name of fidelity.
