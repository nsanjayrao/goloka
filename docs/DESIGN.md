# Goloka — UI Design Brief

This is the binding design spec for all frontend work. The developer agent
follows it; the code-reviewer flags deviations. Goal: a UI that feels like a
premium streaming app with a serene, devotional identity — "Apple TV meets a
temple at dusk." Never generic-SaaS, never cluttered like YouTube.

## 1. Design principles

1. **Content is sacred; chrome is silent.** Thumbnails, titles, and the
   player dominate. UI furniture stays quiet: thin borders, muted surfaces,
   no boxes-inside-boxes.
2. **Calm, not busy.** Generous whitespace, max 2 typefaces, one accent
   color used sparingly. If a screen feels "full", remove something.
3. **Light, warm, Apple-like canvas.** Warm-ivory background, white cards,
   near-black text; the content (thumbnails, hero artwork, poster cards)
   carries all the color. Owner decision 2026-07-03: dark mode is
   REMOVED — the app is light-only, no theme toggle. 2026-07-05 premium
   pass: the canvas warmed from pure white to ivory (#F8F6F2) with white
   cards floating on it — Calm/Headspace warmth on an Apple structure.
4. **Fast is a feature.** Skeletons over spinners, next/image everywhere,
   no layout shift, no heavy animation libraries beyond what's specified.
5. **Mobile is the primary device.** Design at 390px first, enhance upward.

## 2. Color tokens (CSS variables via Tailwind)

Single light palette (dark mode removed 2026-07-03; warmed to the
white-on-ivory "premium pass" palette 2026-07-05):
- `--bg`         #F8F6F2   warm ivory — the page canvas
- `--surface`    #FFFFFF   white — cards, bands, inputs float ON the ivory
- `--surface-2`  #F0ECE2   warm sand — hover/elevated states, badges
- `--border`     rgba(0,0,0,0.06)  hairlines only, never heavier
- `--text`       #191919   near-black (primary text)
- `--text-muted` #6B6B6B   secondary text, metadata
- `--accent`     #B8892F   gold — icons, borders, chips, LARGE accent text
                           only (≥24px, or ≥19px bold); small gold text on
                           ivory/white fails AA — use `--accent-strong`
- `--accent-hover` #D4AF37 brighter gold for hover/active states of gold
                           ELEMENTS (icons, borders, indicators) — never
                           for text on light backgrounds
- `--accent-strong` #8A6420 deep gold for SMALL accent text and SOLID
                           button fills (`--accent-ink` on it stays ~AA;
                           same reasoning as the 2026-07-04 fix)
- `--accent-2`   #1F8577   deep peacock teal — rare, small highlights only
- `--accent-ink` #FFFAF1   text on gold fills

The top bar is the ONE black element on the light page (see §4 App
shell): its text/icons render white via a local CSS-var override on the
header element. The hero *title* zone sits on the bottom scrim, which
fades the artwork into the white page (Apple movie-page style), so it
keeps normal near-black text.

Rules: saffron never used for body text; large fills of accent are forbidden
(chips, underlines, icons, one primary button per view). Verify WCAG AA
contrast for every text/background pair.

## 3. Typography

- **Display**: Fraunces (variable, Google Fonts) — MAJOR titles only:
  hero title, page titles, section headings, the wordmark. Slightly
  tightened letter-spacing, weight 500–600. (2026-07-05: owner brief
  suggested Playfair Display; Fraunces stays — it already fills that
  editorial-serif role and is welded to the approved lotus lockup.
  Swapping it would be a rebrand, which the same brief forbids.)
- **Body/UI**: Inter (variable) — everything else, loaded via next/font.
  Weights 400/500/600/700 only.
- **Hierarchy** (2026-07-05 premium pass — desktop / mobile):
  - Hero title: 64px / 40px, Fraunces, max 2 lines (clamped)
  - Hero subtitle: 20px / 16px, Inter 400, muted-on-scrim
  - Section title: 34px / 26px, Fraunces 500
  - Card title: 16px Inter 500, one-line clamp
  - Card metadata: 13px Inter 400 muted
  - Buttons: 16px Inter 500
- Section headings are the personality carriers. Never all-caps body text
  (the letter-spaced eyebrow label is the one sanctioned exception).
- Sanskrit/Bengali terms render in the same fonts (both cover Latin
  transliteration); do not add extra font files without need.

## 3.5 Space, shape & elevation (2026-07-05)

- **Spacing scale** — every margin/padding/gap comes off this scale, no
  magic numbers: 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 / 80.
  Home-page sections sit 64–80px apart on desktop, 48px on mobile —
  whitespace is the luxury; if a screen feels full, remove something.
- **Radius**: cards 18px; buttons/chips/pills fully rounded (9999);
  hero and full-bleed media bands 24px; surface sections/banners 20px.
- **Elevation** — soft, warm, never harsh. Two recipes only:
  - resting card: `0 1px 2px rgba(25,25,25,.04), 0 8px 24px rgba(25,25,25,.06)`
  - lifted (hover): `0 2px 4px rgba(25,25,25,.05), 0 16px 40px rgba(25,25,25,.10)`
  Nothing darker; no colored shadows; no `shadow-2xl` outside the watch
  page's player.

## 4. Layout & pages (Phase 1b scope)

**App shell**
- Desktop: sticky top bar — logo lockup (lotus mark + "Goloka." wordmark,
  see §6) left, search center (expandable). No theme toggle (light-only).
- Apple-TV black header (owner decision 2026-07-03, matching
  tv.apple.com's global nav): the bar is persistently near-black
  translucent (black/80 + backdrop-blur), white text/icons, hairline
  white/10 bottom border — identical on every page and at every scroll
  position; no transparent-to-frosted switching. On Home the hero
  artwork still bleeds up underneath it and shows through the blur.
- Mobile: top bar shrinks to the lockup + search icon; **bottom tab bar**
  (Home, Browse, Search) with safe-area padding — this is what makes the
  PWA feel native. The tab bar keeps the header's black-glass identity
  (owner decision 2026-07-03) with the 2026-07-05 premium pass: deeper
  blur (~20px), rounded TOP corners (20px) so it reads as a floating
  glass slab, gold active state with a small animated indicator that
  springs between tabs, and a gentle icon scale on selection — all under
  `prefers-reduced-motion` guards.
- Max content width 1280px, horizontal padding 16/24/48px (sm/md/lg).

**Home** (structure mirrors tv.apple.com's home — hero carousel, Top 10,
mixed shelf types, one promo band; owner-provided reference screenshot,
2026-07-03)

1. **Hero carousel** — the 5 newest *feature-length* videos, one slide
   visible at a time. Eligibility rule (2026-07-03, closing the "hero is
   a #short" gap): videos under 2 minutes are excluded from the hero and
   Top-10 pools — Shorts still appear in category shelves and search,
   they just never headline.
   Full-bleed thumbnail at the highest available resolution
   (`maxresdefault.jpg` 1280px, client-side fallback to `hqdefault.jpg` —
   never render a 480px image full-bleed), height ~78vh desktop / ~70vh
   mobile (min 360px) — the hero owns the first mobile screen — bleeding
   up underneath the translucent top bar. Dual scrim (tall bottom bg-fade
   into the ivory page + subtle left wash + top fade under the bar).
   Slide content bottom-LEFT, in order: the gold letter-spaced eyebrow
   ("WELCOME TO GOLOKA"), Fraunces title 64px desktop / 40px mobile
   clamped to MAX 2 lines, a one-line 20px subtitle (the category's
   personality line from category-meta.ts, muted), then two CTAs — the
   gold pill "Watch now" (primary) and a quiet "Browse" ghost pill
   (secondary). Pagination dots bottom-center (real buttons, accent =
   active, aria-labels).
   **Motion** (2026-07-05): auto-advance every ~7s with a ~500ms
   crossfade, plus a slow Ken Burns drift on the active slide's image —
   scale 1.0 → ~1.06 over ~14s, scale ONLY (no pan), ease-linear. Paused
   while hovered or focus is inside; BOTH the crossfade auto-advance and
   Ken Burns are disabled under `prefers-reduced-motion`. No floating
   particles, no parallax — stillness is the brand. No heavy carousel
   library.
2. **"Featured" shelf** (curated, optional — 2026-07-03) — a hand-picked
   row of videos flagged `featured` in the database, rendered FIRST, above
   Top 10: curation outranks recency, the Apple way. Renders nothing when
   no video is flagged (the default state), so it's invisible until the
   owner curates via the Supabase table editor; ISR surfaces changes
   within 30 min. There is no `/browse/Featured` page, so this shelf has
   NO "View all" link (unlike category shelves).
3. **"Top 10 New Arrivals" shelf** — the 10 newest videos across all
   categories, Apple's Top-10 pattern: a huge Fraunces rank numeral
   (~7-8rem desktop, color `--surface-2` so it reads as a watermark,
   partially tucked BEHIND the left edge of its 16:9 card). Below each
   card: one-line clamped title + category label (13px muted).
4. **Category shelves** — one row per category with content, snap-scroll,
   6–10 cards, "View all →". Card widths ~260px mobile / ~320px desktop.
   Desktop affordances: paddle arrows at row edges (on hover, hidden at
   that end, one "page" per click) + soft gradient edge fade; scrollbar
   hidden (wheel/keyboard still work).
5. **"Browse by category" shelf** — Apple's vertical-poster browse row:
   2:3 portrait cards (~200px wide desktop), each a duotone poster built
   from real artwork (owner feedback 2026-07-03: pure gradients read as
   blank): the category's newest video thumbnail full-bleed
   (`object-cover`, center-cropped to portrait), tinted by the category's
   deep-toned gradient via `mix-blend-multiply` (fixed palette of rich
   indigo/teal/plum/slate blends — dark posters that pop on the white
   page, like Apple's genre cards; saffron is still never a fill), plus a
   bottom black scrim so the category name in white Fraunces near the
   bottom stays legible on any artwork. If a category has no thumbnail,
   the gradient alone is the poster (never an empty box). Links to
   `/browse/[category]`. Deterministic gradient per category (a hash of
   the category NAME, not render order) so the same category wears the
   same poster everywhere it appears — home shelf and /browse grid.
6. **Promo band** — once, mid-page (after ~3 shelves): full-width surface
   band, lotus mark + one-line tagline ("Every lecture, kirtan and
   festival — in one place.") + "Browse everything →" button. Quiet, no
   imagery collage, no accent fill.
7. **Row order**: Continue Watching (client-side, when history exists),
   Featured (if any), festival shelf (when a window is open), then Top
   10, topic shelves, Most Watched, then category shelves by recency,
   with the browse shelf slotted after the 2nd category shelf and the
   promo band after the 3rd.
8. **Row variety** (2026-07-05 — rows must not all look identical):
   the page mixes FOUR shelf shapes, each earned by its content, not
   decoration: (a) the **editorial lead** — Featured's first card
   renders large (~2x span) with title/meta overlaid on its artwork,
   remaining featured cards standard beside/below it; (b) **standard
   16:9 rows** — categories, topics, Most Watched; (c) the **poster
   row** — the existing 2:3 duotone browse shelf; (d) the **Top 10
   row** with rank badges. Section titles at 34px Fraunces with 64–80px
   between sections (§3.5). No new shelf shape without a content reason.

**Video card** (the most important component — build it once, perfect)
- 16:9 thumbnail, **18px radius**, borderless artwork (Apple TV: the
  artwork IS the card) sitting with the soft RESTING shadow from §3.5;
  the image fades in on load (skeleton → 300ms opacity, zero layout
  shift). Duration pill bottom-right (12px, surface pill); rank badge
  top-left when in the Top 10 row. Below: ONE-line clamped title (16px
  Inter 500) + one muted 13px meta line (channel · relative date ·
  compact views), truncated to one line.
- Hover (desktop): scale 1.03 + the LIFTED shadow from §3.5 + thumbnail
  brightness ~1.05, on a soft spring (~250ms, slight settle) — an
  Apple-TV lift with warmth, never a bounce. Tap on touch: scale 0.98
  press-in. Both respect `prefers-reduced-motion` (fall back to a plain
  opacity/shadow change).
- **Display titles are cleaned, never raw** (`cleanTitle()` in
  `web/lib/format.ts`, 2026-07-03): hashtags stripped, whitespace
  collapsed, leading/trailing separator junk trimmed, ALL-CAPS titles
  collapsed to title case (devotional abbreviations HG/HH/SB/BG/CC/
  ISKCON preserved). Applies everywhere a title renders — cards, hero,
  watch page, metadata. Editorial hygiene is half of the Apple look.

**Browse index** (`/browse`)
- The duotone poster system, promoted to a full page: responsive grid
  (2 cols mobile → 5 xl) of the same 2:3 tinted-artwork category posters
  as the home browse shelf (shared component), video count as the
  poster's meta line. No flat gray text boxes.

**Category page** (`/browse/[category]`)
- **Duotone banner header** (2026-07-03, carrying the poster identity
  through from the browse shelf/grid): a full-width landscape band
  (~180px tall) using the SAME artwork treatment as `CategoryPoster` —
  the category's newest thumbnail full-bleed, tinted by the category's
  deterministic gradient (`mix-blend-multiply`, same name-hash so the
  page wears the poster the user just clicked), bottom black scrim, and
  the category name in white Fraunces + video count sitting on it. The
  Apple genre-page pattern: the artwork follows you from shelf into page.
  If the category has no thumbnail, the gradient alone is the banner.
- Below the banner (white page): filter chips (channel, duration:
  <15m / 15–45m / >45m); responsive grid: 1 col <480px, 2 sm, 3 md,
  4 lg, 5 xl; "Load more" (chosen over infinite scroll — simpler).

**Video page** (`/watch/[id]`) — the cinematic stage (2026-07-03)
- The player sits on a full-width near-black band (`#141416`) that flows
  seamlessly down from the black header — video players read better on
  dark, and this is the one screen where dark chrome earns its place on
  the light site. Inside the band: YouTube iframe embed, 16:9, rounded,
  `shadow-2xl`, **standard player unmodified** (ToS); below it the title
  (Fraunces, white via the same CSS-var override the top bar uses) and
  the meta row: channel chip + date + duration + share button.
- The **channel chip links to the channel page** (`/channel/[handle]`)
  when the channel has a handle; otherwise it's plain text (handle is
  nullable).
- **Share button** (2026-07-03) — a chip in the meta row: native share
  sheet via `navigator.share` on mobile, clipboard-copy fallback with a
  brief "Copied ✓" state on desktop. Shares the cleaned title + page URL.
  No social SDKs. Client component (needs `navigator`).
- Below the band, back on the white page: collapsible description
  ("More"), then a "More from this category" shelf.
- Share/SEO: `generateMetadata` emits Open Graph + Twitter card with the
  video thumbnail as the image, and the page renders `VideoObject`
  JSON-LD — every shared link unfurls rich, every video is indexable.

**Channel page** (`/channel/[handle]`) — 2026-07-03
- A speaker/channel's own page — the "real product" signal a flat index
  lacks. Header: the channel avatar (`thumbnail_url`, rounded-full),
  Fraunces title, video count. Below: the same `VideoGrid` (with "Load
  more") the category page uses, filtered to this channel — newest first.
- Reached from the watch page's channel chip. Unknown handle → 404.
- Data: `getChannelByHandle`; the grid reuses `getVideosPage` /
  `getVideoCount` with a channel-only filter (category made optional).

**Search** (`/search`)
- Instant results as you type (client query on Supabase, debounced 300ms),
  same card grid. Full-text, relevance-ranked (search_videos_ranked RPC).
- **The bar** (2026-07-05): a floating glass input — 44px tall, fully
  rounded, white/70 + backdrop-blur, hairline border, soft resting
  shadow; the gold focus ring on focus. It is the page's one hero
  element; everything else sits quietly below it.
- **Resting state** (before any query — the page is never a lonely input
  box): the bar, then **Recent searches** (localStorage, max 6, same
  zero-backend pattern as Continue Watching; renders nothing until the
  visitor has searched), then **Popular** chips seeded from the topic
  registry + category names, then the "Newest additions" grid (~10
  newest videos, server-fetched).
- **No-results state**: the gentle lotus line-icon + devotional copy +
  the same suggestion chips.

## 5. Motion

The sanctioned set (2026-07-05 premium pass — grown from the original
single fade-up, still deliberately small). One spring character
everywhere: soft, slightly damped, ~250ms, never bouncy. EVERY item
below degrades gracefully under `prefers-reduced-motion` (to opacity
changes or nothing).

- **Section entry**: fade-up 12px, once, 250ms (unchanged).
- **Card hover/tap**: the §4 lift/press-in springs.
- **Hero**: 7s crossfade + the slow Ken Burns scale drift (§4.1).
- **Tab bar**: gold indicator springs between tabs; icon scale on select.
- **Skeletons**: shimmer matching final dimensions exactly — zero layout
  shift; images fade in 300ms when loaded.
- **Page transitions**: ≤200ms fade.

Explicitly FORBIDDEN (the "peaceful, not flashy" line): floating
particles, button ripples, scroll parallax, scroll-jacking, kinetic
text, anything that moves without the user having caused it (the hero
rotation being the one exception). Stillness is the brand.

## 6. Devotional identity touches (subtle, not kitsch)

- Lockup: the thousand-petal lotus mark, "Concept A — Thousand-Petal
  Bloom" (2026-07-04; `components/icons/logo-mark.tsx`): two offset gold
  petal rings around a hexagonal saffron pericarp, fixed gold-gradient
  palette (NOT currentColor — it reads on both the black bar and the
  ivory page), beside the "Goloka" wordmark in Fraunces with the
  accent-colored period: `Goloka.` The mark also stands alone as the
  favicon and PWA app icon (mirrored SVGs — see CLAUDE.md).
- A single-line lotus SVG divider used max once per page (lives in empty
  states — owner decision; the footer instead carries the logo lockup +
  a one-line "index, not a host" attribution).
- Empty/error states use gentle devotional copy ("Nothing here yet —
  like Vrindavan before the festival.") — warm, never preachy. The
  full-page states (404, offline) additionally carry a Fraunces heading
  and a single "Back to Home" pill so they're never a dead end
  (2026-07-03); the offline page stays fully static (no data fetch — it
  must render with no network).
- **Brand tagline** "Eternal abode of divine love" (2026-07-04): under the
  footer lockup and on the OG share card. Poetic, used sparingly — not a
  page-header subtitle.
- **Daily Inspiration** (2026-07-04): the promo band carries a Srila
  Prabhupada quote chosen deterministically by day-of-year from a curated
  list in `web/lib/quotes.ts` — rotates daily, never mid-day, no backend.
  Fraunces italic + attribution. Owner curates the quote list (devotional
  editorial).
- **Category personality** (2026-07-04): a one-line subtitle per category
  ("Kirtans & Bhajans — soulful melodies that uplift") from a name-keyed
  map in `web/lib/category-meta.ts`, shown on the home browse posters and
  the category-page banner. Categories stay DYNAMIC — an unknown category
  simply gets no subtitle (map miss → nothing), so the never-hardcode-the-
  list rule holds; the map only decorates names it recognizes.
- **Hero eyebrow** (2026-07-04): a small gold letter-spaced "WELCOME TO
  GOLOKA" above the hero title.
- **Gold ornament divider** (`components/ornament.tsx`, 2026-07-04): one
  thin flourish (hairline rule with a small centered lotus/diamond in
  accent), used at most twice per page — the promo band and the footer.
  Sparse is the point; this is the "not kitsch" line.
- NO: om/deity imagery as UI decoration, gradients of orange everywhere,
  devotional clip-art, autoplaying audio. (Historical note: a
  Krishna-with-flute emblem was tried as the brand mark on 2026-07-04
  and REJECTED by the owner after seeing it in place — the detailed
  scene didn't read at small sizes. The lotus stays; the no-deity-
  imagery rule stands.)

## 7. Tech constraints

- Next.js App Router + TypeScript + Tailwind CSS v4 + shadcn/ui primitives
  (Button, Sheet, Skeleton, Badge, Tabs) — install only components used.
- next/image for all thumbnails (YouTube i.ytimg.com domains configured).
- PWA: manifest (name Goloka, theme #0B0E1A, maskable icon), installable;
  service worker can be minimal (offline page) in Phase 1b.
- Data: Supabase anon key + RLS public read; server components for initial
  data, client components only where interactive.
- Lighthouse targets: Performance ≥ 90 mobile, Accessibility ≥ 95.
  Keyboard-navigable throughout; visible focus rings (accent).
- Measured 2026-07-04 (local prod build, mobile, Perf/A11y):
  - **Accessibility: browse 100, category 98, watch 96, home 100** — all
    clear the ≥95 target. Home rose from 91 after two fixes: filled CTAs
    use `--accent-strong` (was 3.44:1 contrast), and carousel dots are now
    24px touch targets (WCAG target-size).
  - **Performance: browse 93, category 91, watch 96** clear ≥90; **home
    72–82** (LCP-bound). Home's LCP is the full-bleed maxresdefault hero
    (design-mandated) — only the first slide is now `priority` so five
    large images don't starve it (LCP 4.2s → ~3.4s). The remaining gap is
    dominated by localhost's on-demand image optimization (Vercel serves
    these CDN-cached) + CPU contention from the dev box; re-verify home on
    the live deploy (PageSpeed Insights) for the production number.
- **SEO & sharing** (2026-07-03): `metadataBase` is the live origin
  (`web/lib/site.ts`, single source), so every page sets an absolute
  `canonical` and OG image URL. `app/sitemap.ts` (bounded: static routes
  + every category + every channel handle + newest ~500 watch URLs,
  revalidated hourly) and `app/robots.ts` (allow all, point at the
  sitemap). Watch pages carry a per-video thumbnail OG image + VideoObject
  JSON-LD; every other page falls back to `app/opengraph-image.tsx` — a
  build-time branded card (lotus mark + "Goloka." wordmark + tagline) so
  no shared Goloka link ever unfurls as a bare URL.
