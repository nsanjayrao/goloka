# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Goloka is a free, centralized ISKCON content hub, live at
https://goloka-three.vercel.app/. **Index, never host**: metadata only,
YouTube embeds (standard player, unmodified — ToS), link-outs — no media
files, ever. Everything runs on free tiers (Vercel, Supabase, GitHub
Actions, YouTube Data API, optional Groq).

**All frontend/UI work MUST follow `docs/DESIGN.md`** — it is the binding
design spec (colors, typography, layouts, motion, page specs). The
code-reviewer treats deviations from it as findings.

## Commands

```
# Frontend (run inside web/)
npm run dev        # dev server at localhost:3000
npm run build      # production build — must pass before any handoff
npm run lint       # eslint

# Worker (run from repo root)
pip install -r worker/requirements.txt
python worker/sync.py          # incremental sync (~100 newest per channel)
python worker/sync.py --full   # deep backfill (~1000 per channel)

# Regenerate PWA icon PNGs after changing the logo mark (inside web/)
node scripts/generate-icons.mjs
```

There is no test suite; verification = build + lint + smoke-testing the
affected routes in the dev server.

## Architecture

Two halves that never talk to each other directly — Supabase Postgres is
the only meeting point:

- **`worker/sync.py`** (Python, single file) — runs every 6h via
  `.github/workflows/sync.yml`. Reads curated channels from
  `worker/channels.json`, fetches uploads via the YouTube Data API,
  classifies each video (regex `CATEGORY_RULES` first, optional Groq LLM
  fallback), and upserts with the **service key** (write access).
  Idempotent. The canonical category list is `CATEGORIES` in this file.
- **`web/`** (Next.js App Router + TS + Tailwind v4) — reads with the
  **anon key** only; RLS in `db/schema.sql` allows public SELECT and
  nothing else. Server components fetch initial data; client components
  only where interactive.

Key frontend conventions (breaking these is what past reviews flagged):

- **All Supabase reads live in `web/lib/data.ts`** behind the `safely()`
  wrapper: every function returns an empty/neutral fallback instead of
  throwing. Pages must render gracefully with an empty or unreachable DB
  — never crash the build or the page. Keep new queries in this file.
- `/` and `/browse` are static with `export const revalidate = 1800`
  (ISR) — without it, pages bake at build time and never show newly
  synced videos. `/browse/[category]` and `/watch/[id]` are dynamic.
- `/watch/[id]` uses the `youtube_video_id`, embeds via
  `youtube-nocookie.com`, and the row is looked up server-side — URL
  params are never reflected into markup.
- Categories are dynamic: `distinct_categories()` Postgres RPC (in
  `db/schema.sql`). Never hardcode the category list in the frontend.
- Queries must stay bounded (`limit`/`range`) — free-tier discipline.
- **Brand mark**: the Thousand-Petal Lotus (owner-chosen; Brahma-samhita
  5.2). One source of truth for geometry: the petal path in
  `web/components/icons/logo-mark.tsx` (theme-aware: currentColor petals,
  saffron center), mirrored with hardcoded colors in `web/app/icon.svg`
  and `web/public/icons/icon.svg`. Rejected alternatives + rationale live
  in `docs/logo-concepts/`. If the mark changes, update all three SVGs and
  re-run the icon script.

Schema changes: edit `db/schema.sql` (kept idempotent) and the owner must
re-run it in the Supabase SQL Editor — there is no migration tooling.

## Environments & deployment

- Root `.env` (from `.env.example`): worker secrets — YOUTUBE_API_KEY,
  SUPABASE_URL, SUPABASE_SERVICE_KEY, optional GROQ_API_KEY. Same four
  live in GitHub Actions secrets.
- `web/.env.local` (from `web/.env.example`): NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY. **The service key must never appear
  anywhere under `web/` or in Vercel.**
- Vercel project "goloka": Root Directory = `web`, the two NEXT_PUBLIC
  vars, auto-deploys every push to `main`.
- Verify a deploy actually happened before declaring success — Vercel has
  missed a webhook before. Check the commit's status via
  `https://api.github.com/repos/nsanjayrao/goloka/commits/main/status`
  (no auth needed); if no Vercel status appears, retrigger with an empty
  commit and push.

## Team workflow: plan first, then code — all in the main session

Owner decisions (2026-07-03): NO agent orchestration. Do not spawn the
general-purpose agent, the developer agent, or any other subagent for
routine work — planning AND coding both happen directly in the main
session. Sequence for any non-trivial task:

1. **Plan first, always, before touching code**: goal, exact
   components/files, constraints, how success is verified. Update
   docs/DESIGN.md first if the design changes. Ask the owner only about
   genuine product decisions.
2. **Build in the main session**, reading only the files needed.
3. **Verify** = `npm run build` + `npm run lint` + the owner smoke-testing
   in the browser. The owner is the design reviewer — ship, let him look,
   iterate on his feedback.
4. **Report** in plain language, teaching as you go (see Owner context).

The `code-reviewer` agent is the one exception — it may still be used for
genuinely large or risky work (schema changes, key handling, sweeping
refactors), with the owner's go-ahead. Commit only when the owner asks.

## Owner context

The owner (Sanjay) has strong Python, is learning React/Next.js and SQL.
Frontend code should be simple and idiomatic — it doubles as his learning
material. Explanations in reports should teach, not just inform.
