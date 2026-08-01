# Ekādaśī panel artwork

Drop illustrations here and they appear on `/ekadashi/<slug>`. Two steps,
no code beyond one flag.

## 1. The file

```
web/public/ekadashi/<slug>/panel-<N>.webp
```

- `<slug>` — the story's slug, e.g. `kamika`, `sat-tila`, `pandava-nirjala`.
  The full list is the `slug` field of each story in
  `web/lib/ekadashi-stories.ts`, and it is derived from the ekādaśī's name
  (`ekadashiSlug()` in `web/lib/vaishnava-calendar.ts`).
- `<N>` — the panel's position in that story, starting at **1**. Panel 3 of
  Kāmikā is `kamika/panel-3.webp`.
- **1200 × 900** (4:3). The page reserves exactly this ratio whether or not
  the file exists, so adding art never moves the text. Off-ratio art will be
  cropped to fill, not letterboxed.
- `.webp` — smaller than PNG at the same quality, and every browser Goloka
  supports reads it.

## 2. The flag

In `web/lib/ekadashi-stories.ts`, on that panel, add `art: true`:

```ts
{
  caption: "The demon Mura had driven the devas out of heaven…",
  art: true,
},
```

The path is derived from the panel's position, so there is no filename in
the data to mistype. A panel without `art: true` renders the pierced-screen
lattice and its panel number instead — a designed state, not a placeholder,
so a story with no artwork at all still reads as finished. **You never have
to do a whole story at once.**

## What not to put here

Anything depicting the Deities that you have not looked at closely. AI image
generators get Vaiṣṇava iconography wrong in ways that are easy to miss and
hard to unsee — arm count, the flute hold, tilaka, Śrīvatsa, the wrong
consort beside the wrong form. On this page a wrong image is worse than the
lattice.

Goloka indexes and links rather than re-hosting other people's work
(`/about` says so publicly), so artwork here should be yours, commissioned,
or under a licence that plainly permits it — not lifted from another
devotional site.
