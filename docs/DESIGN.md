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
3. **Dark-first.** Design every screen dark, adapt light from it.
4. **Fast is a feature.** Skeletons over spinners, next/image everywhere,
   no layout shift, no heavy animation libraries beyond what's specified.
5. **Mobile is the primary device.** Design at 390px first, enhance upward.

## 2. Color tokens (CSS variables via Tailwind)

Dark (default):
- `--bg`         #0B0E1A   deep indigo-night (page background)
- `--surface`    #141A2E   cards, nav, sheets
- `--surface-2`  #1C2440   hover/elevated states
- `--border`     #262F4D   1px hairlines only
- `--text`       #F4F1E8   warm ivory (primary text)
- `--text-muted` #98A2C3   secondary text, metadata
- `--accent`     #F0A83C   saffron — CTAs, active states, focus rings
- `--accent-2`   #34B8A5   peacock teal — rare, small highlights only

Light (adapted):
- bg #FAF7F0 (warm ivory), surface #FFFFFF, text #1B2138,
  muted #5A6382, accent #B97A16 (deepened saffron for contrast), border #E7E1D2.

Rules: saffron never used for body text; large fills of accent are forbidden
(chips, underlines, icons, one primary button per view). Verify WCAG AA
contrast for every text/background pair.

## 3. Typography

- **Display**: Fraunces (variable, Google Fonts) — page titles, section
  headings, the wordmark. Slightly tightened letter-spacing, weight 500–600.
- **Body/UI**: Inter (variable) — everything else. Body 15–16px,
  line-height 1.6; metadata 13px muted.
- Section headings are the personality carriers: e.g. "Kirtans & Bhajans" in
  Fraunces 28–32px. Never all-caps body text.
- Sanskrit/Bengali terms render in the same fonts (both cover Latin
  transliteration); do not add extra font files without need.

## 4. Layout & pages (Phase 1b scope)

**App shell**
- Desktop: sticky translucent top bar (backdrop-blur) — logo lockup (lotus
  mark + "Goloka." wordmark, see §6) left, search center (expandable),
  theme toggle right.
- Mobile: top bar shrinks to the lockup + search icon; **bottom tab bar**
  (Home, Browse, Search) with safe-area padding — this is what makes the
  PWA feel native.
- Max content width 1280px, horizontal padding 16/24/48px (sm/md/lg).

**Home**
1. Hero: latest featured video — full-bleed thumbnail, bottom gradient
   scrim (bg → transparent), Fraunces title overlay, play button, category
   chip. Height ~60vh desktop / ~40vh mobile.
2. Category rows (Netflix pattern): one horizontally scrollable row per
   category with content ("Latest Lectures", "Kirtans & Bhajans",
   "Festivals"…), snap-scroll, 6–10 cards, "View all →" link.
3. Row order: whichever categories have the newest content first.

**Video card** (the most important component — build it once, perfect)
- 16:9 thumbnail, rounded-xl, subtle border; duration badge bottom-right
  (surface-2 pill, 12px). Below: 2-line clamped title (15px medium),
  channel name + relative date muted (13px).
- Hover (desktop): scale 1.02 + border brightens to accent at 40%,
  200ms ease-out. No shadows heavier than `shadow-md`.

**Category page** (`/browse/[category]`)
- Fraunces heading + video count; filter chips (channel, duration:
  <15m / 15–45m / >45m); responsive grid: 1 col <480px, 2 sm, 3 md,
  4 lg, 5 xl; infinite scroll or "Load more" (choose simpler).

**Video page** (`/watch/[id]`)
- YouTube iframe embed, 16:9, rounded, **standard player unmodified**
  (ToS). Below: title (Fraunces 24px), channel chip + date + duration row,
  collapsible description ("More"), then a "More from this category" row.

**Search** (`/search`)
- Instant results as you type (client query on Supabase, debounced 300ms),
  same card grid; empty state with a gentle lotus line-icon and suggestion
  chips of categories.

## 5. Motion

- Framer Motion allowed, sparingly: fade-up 12px on section entry
  (once, 250ms), card hover as above, page transitions ≤200ms fade.
- Skeleton shimmer for loading rows/grids (match card dimensions exactly —
  zero layout shift). No parallax, no scroll-jacking, no kinetic text.

## 6. Devotional identity touches (subtle, not kitsch)

- Lockup: the thousand-petal lotus mark (`components/icons/logo-mark.tsx`)
  beside the "Goloka" wordmark in Fraunces with the accent-colored period:
  `Goloka.` The mark also stands alone as the favicon and PWA app icon.
- A single-line lotus SVG divider used max once per page (footer).
- Empty/error states use gentle devotional copy ("Nothing here yet —
  like Vrindavan before the festival.") — warm, never preachy.
- NO: om/deity imagery as UI decoration, gradients of orange everywhere,
  devotional clip-art, autoplaying audio.

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
