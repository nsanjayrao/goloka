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
   ≤1.5s even if load stalls (shortened from 2.6s, owner decision
   2026-07-18: the longer theatre dominated first-visit LCP), removes
   itself from the DOM, skipped under reduced motion.
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
12. **Time-of-day light** (2026-07-22, Design Manifesto) — the āratī lamp
    (hero, watch page, chant page) and the hero's ember canvas now follow
    the real temple day, sharing ONE hour computation with the eyebrow
    label (`lib/temple-period.ts`'s `useTemplePeriod`, refactored out of
    `components/aarti-period.tsx`): dim and cool before dawn (mangala),
    the site's original baseline at morning (śṛṅgāra — nothing regresses
    for the hours most visitors browse in), brightest at midday
    (rāja-bhoga), warm/flame-toned at dusk (sandhyā — the one period the
    lamp's outer gradient stops turn `--flame` instead of `--marigold`),
    quietest at night (śayana). Applied via a CSS custom property
    (`--lamp-mult` + `color-mix()`) set once by a `data-period` attribute,
    not a continuous loop — the same battery discipline as every other
    ambient effect. `components/temple-lamp.tsx` is the thin client
    island; watch/chant pages stay server components around it.
13. **The Courtyard** (2026-07-22, Design Manifesto) — every `VideoCard`
    meta line reads channel · relative date only; raw view counts were
    removed everywhere a card renders (a number badge turns liturgical
    footage into a metric — popularity survives only as the "Most
    watched" SORT order, never a per-card numeral; `lib/format.ts`'s
    `formatViews` was deleted with its last caller). `FilterChips` keeps
    sort plus any ALREADY-active teacher/duration/language narrowing
    visible as removable tags; the full lists of teachers, durations,
    and languages live behind one quiet "Refine" `<details>` disclosure
    (no client JS, keyboard/screen-reader-native for free) — never a
    flattened wall of pills ahead of the first video.

## 6. App shell & pages

- **Header**: fixed, wordmark (Thousand-Petal Lotus mark + "Goloka" in
  Marcellus — the lotus stays; owner brand decision supersedes the
  prototype's plain bindu dot), uppercase nav, search pill → /search.
- **Watch page**: player on midnight, title in Marcellus, related videos
  as one row, lamp glow behind the player at low intensity.
- **Browse/search/topic/channel/leaders/about**: same tokens, header,
  footer, card components; grids of the same `.card` language.
- **Books (/books, Phase 3)**: typographic "spine" cards — gold rule +
  Marcellus title on a shyama gradient, NO cover artwork (rights-safe,
  metadata-only). Dual link-outs per book (Vedabase read-free + official
  BBT store search URLs; deep product links rot, search is stable) plus
  an inward "Classes →" link. "Devotional essentials" links official
  stores only — never third-party sellers (owner decision 2026-07-18).
- **Temples (/temples, Phase 3)**: curated cards (lib/temples.ts) with
  website link-out, inward /channel link when indexed, and the LIVE
  badge when the temple's channel is currently streaming (ISR 600 to
  track the 15-min live check).
- **Accounts (Phase 4, 2026-07-18)**: OPTIONAL Google sign-in whose only
  data is two lists (favourite / watch_later in `saved_videos`,
  RLS-scoped). Auth is entirely client-side — server components stay
  anonymous, shared pages identical for everyone. Watch HISTORY stays in
  localStorage forever (the privacy line). Surfaces: heart + bookmark on
  the watch page (a tap while signed out starts Google sign-in and
  returns to the same page), /library with two grids, Library in the
  header/footer and as the 4th mobile tab. About page words this
  honestly — "no accounts" became "optional account, two lists, nothing
  else, delete = gone".
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
  CLS < 0.05. Measured 2026-07-18 (production, median of warm runs):
  Accessibility 100, Best-Practices 100, SEO 100, CLS 0, Performance 85
  (watch page 81). The remaining perf gap is structural and accepted:
  first-visit LCP carries the (shortened, 1.5s) darshan curtain plus the
  full-viewport hero artwork over simulated 4G - closing it would mean
  cutting signature elements, which the owner declined.

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

## 9. The invocation thread (2026-07-22)

The whole product is built in Śrīmatī Rādhārāṇī's mood — an offering made
FOR Kṛṣṇa's pleasure, not an app optimizing a user (owner decision
2026-07-22: "Her touch on every element"). Concretely, Her touch is
RESTRAINT, expressed two ways:

1. **The invocation.** "Rādhe Rādhe" appears as a small fixed liturgical
   line — `text-[13px] uppercase tracking-[0.24em] text-marigold`, exactly
   as the chant page opens — at the app's THRESHOLDS: the chant space, the
   sādhana record, the footer (above the mahā-mantra inscription), and the
   not-found page (a lost visitor is met with Her name). It is liturgical
   text: never translated, never restyled per-page, never animated. Do not
   scatter it further — a signature that appears everywhere signs nothing.
2. **The register.** Interface copy at rest states (empty, error,
   not-found) speaks devotionally-warm, never database-cold ("Nothing here
   yet — like Vrindavan before the festival", never "No results found").
   Streaks, milestones, and vows (sankalpa) exist only in their fulfilled
   or living form; falling short is met with SILENCE, not markers. No fire
   emoji, no loss language, no urging — anywhere, ever.

Everything else about Her mood is already carried by the existing system:
the midnight canvas, the gold restraint, the calm motion. Do not add
ornament in Her name.
