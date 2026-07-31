# Goloka — UI Design Brief (Midnight, with the Aruṇa option, 2026-07-24)

This is the binding design spec for all frontend work. The code-reviewer
flags deviations. **`web/app/globals.css` is the source of truth for all
visual decisions** — the token block at the top of that file defines the
active Midnight system, and the `:root[data-theme="aruna"]` block at the
bottom defines the alternate Aruṇa palette. `goloka-final.html` in the repo
root is a HISTORICAL artefact (the original Midnight prototype); the app has
since grown well past it, so do not port from it. The Known Defects in §8
still apply.

Identity (active): **a temple at dusk**. Deep śyāma-indigo night sky, a
living gold lamp, serif Devanagari-friendly type. Cinematic and devotional
— never generic-SaaS, never cluttered like YouTube. Owner preference,
2026-07-24: after building and living with the Aruṇa dawn palette, the
Midnight canvas is the one that ships.

**The theme is one attribute, and both are kept.** With no `data-theme` on
`<html>` the app is Midnight (the current default). Adding
`data-theme="aruna"` — in BOTH root layouts, `app/[locale]/layout.tsx` and
`app/(legacy)/layout.tsx` — switches the whole app to the Aruṇa dawn
palette without touching a single component. That reversibility is exactly
what the Phase-0 token layer (§2c) was built for, and it is why Aruṇa is
documented in full below rather than deleted. Aruṇa's own rationale (Her
*tapta-kāñcana* complexion versus the *nīla* She wears; gold as ground,
indigo as structure) is preserved in §2 for whenever it is wanted.

## 1. Design principles

1. **Content is sacred; chrome is silent.** Thumbnails, titles, and the
   player dominate. Gold is an accent — hairlines, small text, icons,
   one solid button per view. Large marigold fills are forbidden.
2. **The page is night, not black.** The canvas is `--midnight` #0A0F26
   (deep indigo), never #000. Surfaces are raised indigos, borders are gold
   hairlines at low alpha, elevation is a deep soft black shadow. (Under the
   Aruṇa option the same principle inverts to "dawn, not white": a #FBF4E9
   candana ground, cards LIGHTER than the page, kumkum hairlines, and a warm
   rose shadow instead of a black one.)
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

### 2a. The token names are jobs, not colours

The token NAMES stay constant across both themes, because ~50 components
already say `bg-midnight` / `text-chandan` / `hover:text-flame` — building
Aruṇa as a re-point of values rather than a rename is what made it a token
block instead of a fifty-file rewrite. Read each by its job: **`--midnight`
is "the page", `--chandan` is "the ink", `--flame` is "the hover".** Do not
add a new token whose name describes a colour; describe what it is for.
(Midnight is the active column; Aruṇa is the alternate theme.)

| Token | Midnight (active) | Aruṇa (option) | Job |
|---|---|---|---|
| `--midnight` | #0A0F26 | **#FBF4E9** | the page (candana — sandal paste) |
| `--shyama` | #131A3E | **#FFFDF9** | cards. Under Aruṇa this is LIGHTER than the page, so cards rise off it |
| `--shyama-2` | #1A2350 | **#F6EBDA** | raised / hover / skeletons |
| `--chandan` | #F3EDDF | **#241A2B** | primary text (kajjala — warm plum-black) |
| `--muted` | #9AA3C7 | **#6B5B70** | secondary text, metadata |
| `--kumkum` | — | **#A32B4E** | the accent that carries TEXT |
| `--flame` | #F5C97B | **#8A2342** | hover. On a light ground, hover DARKENS |
| `--lotus` | #D9A0B0 | #E9A6B8 | decorative wash only |
| `--marigold` | #E8A33D | #E8A33D | **unchanged, and ornament/fills ONLY** |
| `--gold-ink` | — | **#A86A16** | signature ornament that must stay gold (§5.8) without washing out on ivory |
| `--live` / `--live-soft` | #E05B5B / #E58A8A | same | live dot, badge, viewer counts |

Semantic aliases (so app code stays palette-agnostic): `--bg`=midnight,
`--surface`=shyama, `--surface-2`=shyama-2, `--text`=chandan,
`--text-muted`=muted, `--accent`, `--accent-hover`, `--accent-strong`,
`--accent-ink` (text on gold fills), `--border`, `--hairline`.

**`--accent` is marigold under Midnight and kumkum under Aruṇa.** This is
why no component may write `text-marigold` for text — always `text-accent`.
It keeps text legible in either theme with no component change.

### 2b. Measured contrast — re-measure, never assume

**Midnight (active):** chandan on midnight 15:1 · muted 7.6:1 · marigold
8.8:1 — all clear AA for small text on the dark canvas.

**Aruṇa (option), on the worst of its three grounds:** ink 15.3:1 · muted
5.7:1 · kumkum 6.4:1 · hover 8.0:1 · `--gold-ink` 4.1:1 (decorative, 3:1
target) · ink on a marigold fill 7.7:1 · chip text over artwork 16.2:1.
**Marigold on candana is 1.97:1 and flame is 1.42:1** — the single
measurement that shaped Aruṇa: on a light ground gold survives only as a
*fill* with dark text on it, or as ornament, never as text.

### 2c. Channel triplets and purpose-named surfaces (Phase 0)

Every translucent colour is mixed as `rgb(var(--x-rgb) / alpha)` from a
`R G B` triplet, never a literal `rgba()`. There are no colour literals
below the token block in `globals.css`, and there must not be new ones.

Three splits matter, and collapsing any of them back is a bug:

- **`--glass` vs `--scrim`** — identical values under Midnight. `--glass`
  is chrome that follows the page (header, mobile tab bar) and inverts with
  the theme. `--scrim` is a dark overlay laid OVER artwork (duration/
  language/rank chips, the hero and split gradients, the play button) and
  is **pinned to `10 15 38` under Aruṇa**: a chip on a photograph needs a
  dark ground whatever colour the page is.
- **`--glow` / `--glow-hi` vs `--flame` / `--marigold`** — the lamp and the
  ember particles need *light*, which must stay gold even in a theme where
  `--flame` has become a dark rose hover colour.
- **`--shadow-rgb`** — `0 0 0` on Midnight, `90 45 60` on Aruṇa. Black
  shadow on a warm ground reads as dirt.

## 3. Typography

Google Fonts via `next/font` (self-hosted at build, zero layout shift):

- **Display: Marcellus** (single weight 400) — hero title, section
  titles, quotes, the wordmark, category card titles, watch-page title.
- **Body/UI: Figtree** (400/500/600) — everything else.
- **Devanagari fallback: Tiro Devanagari Hindi** — in the stack of BOTH
  families, so Hindi titles render as elegant serif, never system
  fallback.

Scale (from the prototype, formalized as a binding ladder 2026-07-22 —
Design Manifesto "The Weight of a Word"): every new size reaches for one
of these first; a fresh one-off px value is a signal something drifted,
not a free choice.

| Level | Size | Weight | Face | Use |
|---|---|---|---|---|
| Hero h1 | `clamp(30px,5.2vw,62px)` lh 1.13 | 400 | Marcellus | the one LCP title, home hero only |
| Page h1 | `text-3xl` → `sm:text-4xl` (30–36px) | 500 | Marcellus | every other page's title |
| Section h2 | `clamp(22px,2.6vw,32px)` | 400 | Marcellus | home row headings |
| Card/sub-heading | 19–28px (19/20/22/26/28 by context) | 400 | Marcellus | book/temple/category names, step titles — width-dependent, not one fixed value |
| Quote | `clamp(28px,4.4vw,58px)` lh 1.22 | 400 | Marcellus | pull-quote interludes — the largest interlude, always below Hero h1 |
| Body prose | 15–16px, `leading-relaxed` | 400 | Figtree | paragraphs — see the measure rule below |
| Secondary text | 13–14px | 400 | Figtree | card titles, descriptions, step "why" text |
| Meta | 12–13px, muted | 400 | Figtree | card meta lines, captions |
| Kicker/eyebrow | 11–13px, uppercase | 400–600 | Figtree | `.18–.28em` tracking, always on its own line above a title |

**The measure**: any block of genuine multi-sentence body prose (About,
Start's welcome/outro, page intros, footnotes) is constrained to
`max-w-measure` (a real design token, `globals.css`'s `--max-width-
measure: 480px`) — 65–68 ACTUAL characters of running Figtree prose at
16px, verified with `canvas.measureText()` against real page copy, not
assumed. Deliberately NOT Tailwind's own built-in `max-w-prose`: that
utility is 65ch, and `ch` is the width of the "0" DIGIT, which for
Figtree measures wide enough that 65ch resolves to ~667px and actually
renders ~92 characters per line on this site's real prose — a name that
promises the measure without delivering it. Re-measure `--max-width-
measure` if the body face or its base size ever changes; don't assume
`ch` tracks correctly for a new typeface either. Put the token on the
paragraph itself (or a div containing ONLY paragraphs/sub-headings meant
to share the reading column, like About's stacked sections) — never on
a wrapper that also holds a page h1, which wants the fuller column width
a heading is allowed. Headings, kickers, and short one-line captions are
exempt; the measure governs reading paragraphs only.

## 4. Layout & rhythm

- One shared gutter: `--pad: clamp(20px,4vw,56px)`. **Every** full-bleed
  section (hero, live strip, rows, split, quote, categories, footer)
  uses the same `--pad` left/right — the §8 alignment audit checks this.
- Radii: video cards/thumbs 14px, feature card 18px, category cards
  16px, live/mini cards 14px, buttons/pills 999px.
- Easing: `cubic-bezier(.2,.7,.2,1)` (exposed as `--ease-spring`) for
  lifts/reveals — and for the play button too, as of 2026-07-23. The play
  button previously used `cubic-bezier(.2,.7,.3,1.4)`, which OVERSHOOTS past
  its target; nothing in the app rebounds anymore (the motion vocabulary
  forbids it outright — grace does not spring back).
- Section rhythm is VARIED, never flattened: horizontal snap rows →
  feature split (one large card + stacked minis) → centered quote
  interlude → category grid → more rows.
- **Home's three movements (2026-07-23).** The page had grown to fourteen
  stacked sections of near-identical shape with nothing to orient by. Every
  home section now sits inside one of three `<Movement>`s
  (`components/movement.tsx`): **Today at the temple** (live, calendar,
  observances), **Your path** (doorways + the three personalised shelves),
  **The library** (arrivals, festival, split, quote, topics, categories,
  most-watched). The marker is the quietest thing that still works as a
  landmark — a 13px uppercase label at `0.28em` and a hairline that fades
  out; no display type, no icon, no full-width rule (§9: structure, not
  ornament). It must stay LARGER than the 12px section kicker nested inside
  it: at the original 11px the landmark was a pixel smaller than its own
  child, in the same colour and case, and the hierarchy read backwards
  (corrected 2026-07-30). The wider tracking, not colour, is what keeps it
  the quieter of the two — this label is never gold.
  A movement that could render empty must be guarded server-side — "Today"
  checks live/ekadashi/observances — because a heading stranded over
  nothing is worse than no heading. New home sections join a movement;
  they are never added as a fourteenth loose sibling.
- Section headings: small uppercase kicker on its own line ABOVE the
  Marcellus title (never beside it), gold ❋ mark before the title,
  "View all →" baseline-aligned right.

## 5. Signature elements (copy, don't reinvent)

Most originate in the prototype; §§14–17 are the 2026-07-23 "last layer"
additions and are marked as such. The page-load preloader (old §5.1) was
DELETED that day — see §14.

1. **Darshan curtain — on the PLAYER, not the page** (moved 2026-07-23).
   In a temple the curtain does not part once on arrival; it parts for
   every darśana. So the curtain left the page preloader (that component,
   `veil.tsx`, is deleted) and moved into `components/lite-embed.tsx`: silk
   panels in three dyed tones (`--silk-*`, deliberately theme-INDEPENDENT —
   cloth doesn't change colour because the wall did) cover the embed and
   part on a 2.1s glide when a devotee presses "Begin listening". The
   consequence is the point: the YouTube iframe now waits for intent from
   EVERY visitor (not only data-saver), loads BEHIND the closed curtain, and
   the buffering wait becomes the moment before darśana instead of latency
   to apologise for. The embed itself stays standard and unmodified (ToS);
   the curtain only ever sits above it and is removed from the DOM once
   parted. Under reduced motion the panels never render — there is nothing
   to wait behind.
2. **Living āratī lamp / dawn wash** — breathing radial glow behind the
   hero (pure CSS); low-intensity variant behind the watch-page player and
   in the footer. Its gradient stops use `--glow` / `--glow-hi`, NOT
   `--flame`, so it stays gold in every theme. Under Aruṇa it becomes a
   **dawn wash**: same element, same breath, same time-of-day multiplier, at
   45% opacity with a rose (`--lotus`) outer — on ivory you are warming a
   page, not lighting a dark room.
3. **Diya embers / pollen** — hero canvas particles (~42 desktop / ~22
   mobile), requestAnimationFrame with unmount cancel, off under reduced
   motion. Particle colour is NOT hardcoded: the canvas reads
   `--ember-fill`, `--ember-halo` and `--ember-blend` from the theme. Under
   Aruṇa these become rose-gold pollen drawn with `multiply`, so the specks
   darken into the page instead of glowing out of it.
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
11. **Film grain / paper tooth** — fixed overlay, `steps(8)` shift; and the
    glassy header: transparent gradient at top, blur + hairline after 40px
    scroll. Under Aruṇa the same turbulence SVG drops to opacity .035 with
    `mix-blend-mode: multiply`, so it reads as the tooth of handmade paper
    rather than television static.
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
14. **The jālī** (2026-07-23, `components/jali.tsx`) — the app's signature
    image: light does not merely arrive from a direction, it falls THROUGH
    a pierced stone screen, and the lattice it throws travels the page as
    the hour turns (long and raking at maṅgala, tight overhead at
    rāja-bhoga, stretched back at sandhyā, nearly gone at śayana). Two
    repeating gradients and a transform — no image, no canvas, no request —
    keyed off the SAME `data-period` as the lamp (`useTemplePeriod`), sitting
    behind content at low opacity, never over text. It is NOT wrapped in the
    Aruṇa block, so it renders in both themes. Intensity is one theme-aware
    number, `--jali-gain`: 2.8 on the active Midnight canvas (raised from 2.1,
    owner decision 2026-07-30 — 2.1 had been tuned against a briefly-deleted
    blur, so the gain now carries the presence and `filter` carries the
    diffusion; the two are separate controls and must not be used to fake each
    other), and fuller (3.4) under
    the Aruṇa option, where the same shaft is only subtle warmth on ivory.
    Tune that one value to make it stronger or softer.
15. **Krṣṇa is not on schedule** — the one place the app is
    non-deterministic. Everything else happens every time (Her discipline);
    a few things happen SOMETIMES (His play), can never be triggered, and
    are never referred to anywhere in the UI. Shipped: **the feather**
    (`components/feather.tsx`) — a drawn peacock feather drifts down roughly
    1 visit in 15, decided in the browser after mount so it is never baked
    into the ISR cache, off under data-saver and reduced-motion. The budget
    is THREE such things total (the flute and the Śarad-Pūrṇimā full-moon
    night are designed but not built); it stays three — the moment līlā
    becomes a feature list it becomes a casino.
16. **The verse** — the home quote interlude (`.quote`) is the largest
    interlude in the app: larger than any section heading, and deliberately
    SMALLER than the hero h1, which remains the one thing that owns the page.
    `clamp(28px,4.4vw,58px)` at lh 1.22, positive tracking, `max-width: 860px`
    — which lands 27–29 characters per line, the phrase-per-line shape an
    inscription actually has. It is followed by a real breath: an asymmetric
    margin (12vh before, 16vh after) so the verse ends a thought rather than
    floating between two equal gaps. Scale VERTICALLY if it is ever pushed
    further, never horizontally — a too-wide line breaks WCAG reflow at 320px
    and the no-sideways-scroll rule.

    *Corrected 2026-07-30, and the failure is worth keeping on the record.
    The 2026-07-23 pass reached for "an inscription you move down to read"
    and took the verse to `clamp(38px,7.6vw,104px)` with a `.quote::after` of
    one empty 62vh screen. Measured: 104px against the hero's 62px, so the
    verse outranked the LCP title on every screen above 375px and the page
    lost its centre of gravity; the line held ~22 characters, which is
    word-per-line, not inscription. And because `QuoteBlock` sits MID-movement
    (between the split feature and the topic rows), the empty screen read as a
    page that had failed to load rather than as rest — the right architecture
    applied at the wrong seam. A rest screen only works at a structural
    boundary. The lesson generalises: this section asserted a size that §3's
    ladder never adopted, so the spec carried both the rule and its violation
    for a week. When a signature element changes scale, §3 changes in the same
    edit or the change is not real.*
17. **The lit lamp** (`components/icons/diya.tsx`) — favouriting on the
    watch page lights a diya that stays lit and breathes on prāṇa (the same
    6.5s cycle as the āratī lamp), instead of a heart filling in. An
    offering, not a like; watch-later keeps a plain bookmark, because "not
    now" and "I offer attention here" are different acts. No count, no
    streak, no burst. **The humility flaw**: one outer petal of the lotus
    mark is deliberately 0.9° short and a hair low (`FLAW_*` in
    `logo-mark.tsx`, mirrored in both icon SVGs) — a made thing should not
    claim the perfection that belongs to God alone. Do not "fix" it.
18. **The Vrindavan hour** (`components/vrindavan-hour.tsx`) — one quiet
    line in the home "Today" movement naming the REAL current hour in
    Vrindavan (from the browser's `Intl` timezone data, no network) and what
    the temple is doing right now. Every other time-aware surface describes
    the visitor's own hour; this one points at the real place. Renders
    nothing until the browser has a clock (neutral server snapshot = null).

## 6. App shell & pages

- **Navigation (rebuilt 2026-07-23).** The rule: *every route must be
  reachable on a phone without opening the footer.* Before this, the header
  hid all seven nav links under 600px and the tab bar had four slots, so
  Chant, Calendar, Sādhana, Temples, Books, Leaders, Begin Here and About
  had no mobile entry point at all.
  - **Header**: fixed, wordmark (Thousand-Petal Lotus mark + "Goloka" in
    Marcellus — the lotus stays; owner brand decision). FOUR primary links
    (Browse, Chant, Calendar, Library) + a **More** trigger + the search
    pill. The current link carries `aria-current="page"` and an accent
    underline — the header must never look identical on every page again.
  - **Bottom tab bar** (mobile): FIVE slots — Home, Browse, Chant, Library,
    More. Search is deliberately NOT a tab: the header search pill is the
    one piece of nav that survives under 600px, so a Search tab was the
    only duplicated destination.
  - **`MoreSheet`** (`components/more-sheet.tsx`): a native `<dialog>` —
    focus trapping, Escape and page inertness come free, so don't hand-roll
    an overlay. ONE link list feeds both the header trigger and the mobile
    tab, so they cannot drift apart. Add new secondary routes there.
  - **Breadcrumbs** on watch (→ its category), series (→ its channel),
    channel and topic (→ Browse). Deliberately NOT browser history, which
    lies when a devotee opens a shared WhatsApp link cold.
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
  localStorage forever (the privacy line). Surfaces: a lit-lamp favourite
  (§5.17) + a watch-later bookmark on the watch page (a tap while signed
  out starts Google sign-in and returns to the same page), /library with
  two grids, Library in the header/footer and as the 4th mobile tab. About
  page words this honestly — "no accounts" became "optional account, two
  lists, nothing else, delete = gone".
- **Empty states / skeletons**: shyama surfaces, muted text — never
  white flashes.
- PWA (Midnight active): `themeColor` #0A0F26 in BOTH root layouts;
  `manifest.json`'s `theme_color` and `background_color` match; the OG share
  card is dark ground / chandan text / gold lotus. The app ICONS are a dark
  tile with the gold lotus (`app/icon.svg`, `public/icons/icon.svg`) in
  either theme — a home-screen icon is not page chrome. If the Aruṇa option
  is ever switched on, these four surfaces (two `themeColor`s, the manifest,
  the OG card) are the hardcoded ones to flip to candana with it; the icons
  stay dark regardless.

## 7. Architecture rules

- Server components for all content; client islands ONLY for: the player
  curtain (§5.1), the jālī and feather (§5.14–15), embers, hero rotation,
  āratī period, the Vrindavan-hour line, scroll reveals, row arrows, header
  scroll state, and existing localStorage personalization. Keep each tiny;
  pass server-rendered content through as `children`. Anything that must be
  occasional/per-visit (the feather) decides in the browser after mount, so
  it is never baked into the ISR cache.
- All Supabase reads stay in `web/lib/data.ts` behind `safely()`;
  queries bounded; pages render gracefully on an empty/unreachable DB.
- Images: next/image; thumbs `i.ytimg.com/vi/{id}/hqdefault.jpg`, hero
  `maxresdefault` with `hqdefault` fallback; hero image priority-loaded;
  lazy below the fold.
- No new animation dependencies. (framer-motion is already installed but
  the signature elements use vanilla CSS/JS per the prototype.)
- **Motion vocabulary** (2026-07-22, Design Manifesto motion audit): every
  ambient/decorative animation in the app is one of three things - a
  BREATH (slow opacity/scale pulse: the lamp, the chant-listening glow,
  the lit karaoke word), a DRIFT (slow floating movement: the hero
  image's 26s Ken-Burns pan), or a CURTAIN (a threshold crossed once:
  the darshan curtain parting on the PLAYER when a devotee presses
  "Begin listening" (§5.1 — it is no longer a page preloader; `veil.tsx`
  was deleted 2026-07-23), `.rise`/`route-in`'s quieter
  fade-and-rise for routine content/page entrances - the same idea at a
  smaller scale, not a literal curtain for every card). Functional
  feedback is a SEPARATE category, exempt from this list because it
  carries information rather than atmosphere: the hero progress bars
  filling (how long until the next slide), the live-dot and skeleton
  pulses (a status, not a mood), film grain's texture shift (material
  simulation, not object motion). Audited and fixed: the scroll-cue's
  vertical bob was a literal bounce - the one thing named outright as
  forbidden - and is now a static chevron; the orphaned `bindu-glow`
  keyframe (zero call sites) was removed. Every JS-driven animation
  (embers, hero rotation, the player curtain in `lite-embed.tsx`) already checks
  `prefers-reduced-motion` itself and stops outright, on top of the
  blanket CSS kill-switch (§1 principle 3's `*` rule) - confirmed, not
  assumed, by reading each one during this audit.
- Keyboard: visible flame focus rings everywhere; one h1 per page; alt
  text on thumbnails; aria-labels on rows/arrows/progress bars.
- Lighthouse mobile targets: Performance ≥ 90, Accessibility ≥ 95,
  CLS < 0.05. Measured 2026-07-18 (production, median of warm runs):
  Accessibility 100, Best-Practices 100, SEO 100, CLS 0, Performance 85
  (watch page 81).

  **Re-measured 2026-07-30** against live production, Lighthouse 12.8.2,
  mobile/simulated. Home is the median of four runs; the others single runs.

  | route | Perf | A11y | BP | SEO | LCP | TBT | CLS |
  |---|---|---|---|---|---|---|---|
  | `/` | **74** (64–77) | 100 | 100 | 100 | 4.8s | 330ms | 0 |
  | `/watch/[id]` | **83** | 100 | 100 | **92** | 3.2s | 320ms | 0.011 |
  | `/browse` | **93** | 100 | 100 | 100 | 2.7s | 150ms | 0 |

  Read these honestly. **Home's four runs spanned 64–77 — a 13-point spread —
  so the gap against the old 85 cannot be called a regression**; the runs are
  from a different machine and network than the 2026-07-18 figure, and single
  Lighthouse runs on this box are noisy. Quote the median or nothing.

  Two predictions made when the layer shipped turned out WRONG, and are
  corrected here rather than quietly dropped:

  - Moving the YouTube iframe behind the play tap was expected to move the
    watch score "materially". It went 81 → 83. The player JS was never the
    binding constraint.
  - The home gap was blamed on the hero artwork over slow network, and then
    (2026-07-30, by me) on a 3.7s "render delay" holding the loaded hero
    image. **Both are wrong.** The 3.7s figure came from Lighthouse's DEFAULT
    *simulated* throttling, whose timings cannot be correlated with the trace
    — the trace is recorded unthrottled and the metrics are modelled from it.

  **Re-run with `--throttling-method=devtools` (real 4× CPU + slow 4G), which
  is the only mode whose trace timings mean anything:** Perf 41, FCP 4948ms,
  LCP 5382ms, TBT 1217ms. LCP is only **434ms after FCP** — the hero is not
  waiting on anything; *nothing at all* paints for five seconds.

  **The cause is font loading, and it is worth 1385ms of it.** Eight Layout
  events fire before LCP, totalling 1390ms, four of them near-whole-document:

  | when | cost | dirty objects |
  |---|---|---|
  | 2937ms | **702ms** | 344 / 344 |
  | 3656ms | **439ms** | 220 / 552 |
  | 4230ms | **161ms** | 551 / 552 |
  | 5218ms | **83ms** | 551 / 552 |

  They line up with font arrivals: `RemoteFontLoaded` fires **nine** times,
  **14 `@font-face` rules** ship, all at `font-display: swap`, and two font
  files are not even requested until 2938ms and 3091ms. Every arrival
  re-lays-out a 14,222px document of 1,527 elements. Style recalc across the
  same window is only 237ms, so this is **layout, not style** — the
  "styleLayout" label misleads.

  Three hypotheses were tested and **disproved** — do not re-litigate without
  new evidence:

  - *Scroll reveals gate paint.* Forced `prefers-reduced-motion` (which makes
    the CSS reveal everything immediately): LCP moved 4768ms → 4616ms.
  - *The ember canvas competes with load.* Its first `requestAnimationFrame`
    is at **7741ms** — zero frames before LCP. Innocent.
  - *Rasterisation is the cost.* 384 RasterTasks before LCP total **15ms**.
    High count, trivial cost.

  **The SEO 92 on `/watch/[id]` is a MEASUREMENT ARTEFACT, not a defect — do
  not "fix" it.** Next 16 streams metadata by default and serves *blocking*
  metadata (tags inside `<head>`) only to user agents matching
  `htmlLimitedBots`. Verified by request: `Chrome-Lighthouse` (what PageSpeed
  Insights sends), `Twitterbot`, `facebookexternalhit`, `WhatsApp` and
  `Google-InspectionTool` all receive the tags **in `<head>`**; a plain Chrome
  UA — which local Lighthouse sends — gets them streamed into `<body>`, and
  React does not hoist them. So social unfurling and PSI are correct, and the
  only consumer that sees them in `<body>` is a JS-capable browser, which is
  exactly the case Next streams for on purpose. The single lever if this is
  ever revisited is the top-level `htmlLimitedBots` regex; there is no
  `streamingMetadata: false` in this version.

  One real defect this run surfaced, now fixed: `label-content-name-mismatch`
  (WCAG 2.5.3 Label in Name) on two controls whose `aria-label` did not
  CONTAIN their visible text — the up-next switch (label dropped; the visible
  text is the accessible name now) and the signed-out save buttons, where the
  sign-in label was introduced by the 2026-07-30 `aria-pressed` fix and now
  interpolates the visible label instead of replacing it. The rule for this
  codebase: an `aria-label` on a control with visible text must contain that
  text verbatim, or a speech-input user cannot say what they see.

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
   line — `text-[13px] uppercase tracking-[0.24em] text-accent`, exactly
   as the chant page opens — at the app's THRESHOLDS: the chant space, the
   sādhana record, the footer (above the mahā-mantra inscription), and the
   not-found page (a lost visitor is met with Her name). It is liturgical
   text: never translated, never restyled per-page, never animated. Do not
   scatter it further — a signature that appears everywhere signs nothing.

   *The class is `text-accent`, not `text-marigold` (changed 2026-07-23).
   On active Midnight this renders as marigold, exactly as before; the
   change future-proofs the invocation for the Aruṇa option, where marigold
   on candana measures 1.97:1 and the accent resolves to kumkum instead. Use
   `text-accent`, never a literal colour, for this line.*
2. **The register.** Interface copy at rest states (empty, error,
   not-found) speaks devotionally-warm, never database-cold ("Nothing here
   yet — like Vrindavan before the festival", never "No results found").
   Streaks, milestones, and vows (sankalpa) exist only in their fulfilled
   or living form; falling short is met with SILENCE, not markers. No fire
   emoji, no loss language, no urging — anywhere, ever.

Everything else about Her mood is already carried by the existing system:
the midnight canvas, the gold restraint, the calm motion. Do not add
ornament in Her name.
