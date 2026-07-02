# Goloka — web

The Next.js frontend (Phase 1b). Reads video/channel metadata from Supabase
(public anon key, read-only) and renders it — no media is ever hosted here;
videos play through the standard YouTube embedded player. See the repo
root's `README.md` and `docs/DESIGN.md` for the full picture.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev                  # http://localhost:3000
```

`.env.local` needs:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase Dashboard -> Project Settings -> API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page, the anon/public key (never
  the service_role key — that one belongs only to `worker/`)

The app is designed to run without these set too (every page falls back to
an empty state) — useful for working on layout/styling without a database.

## Scripts

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm run start    # run a production build
npm run lint     # ESLint
```

## Structure

- `app/` — routes (App Router): home, `/browse`, `/browse/[category]`,
  `/watch/[id]`, `/search`, `/offline`.
- `components/` — shared UI, including `components/ui/` (shadcn primitives).
- `lib/` — `supabase.ts` (client), `data.ts` (all Supabase queries),
  `format.ts` (duration/date formatting), `types.ts`.
- `public/` — PWA manifest, icons, and the offline-fallback service worker.
