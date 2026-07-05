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
npm run test       # vitest — pure-logic unit tests (web/lib/*.test.ts)

# Worker (run from repo root)
pip install -r worker/requirements.txt
python worker/sync.py          # incremental sync (~100 newest per channel)
python worker/sync.py --full   # deep backfill (~1000 per channel)
python worker/sync.py --enrich # re-process EXISTING rows: refresh view_count + re-classify

# Regenerate PWA icon PNGs after changing the logo mark (inside web/)
node scripts/generate-icons.mjs
```

Vitest covers the pure-logic layer only (`web/lib/*.test.ts`: formatters,
`safeDecodeURIComponent`, festival-window date math, the Continue Watching
localStorage logic) — no React component or page tests. Verification is
still build + lint + `test` + smoke-testing the affected routes in the dev
server; there's no CI step running any of this yet (all manual).

Groq's free tier rate-limits hard on big classification runs — `sync.py`
batches (~15 videos/call) with 429 backoff, but a full backfill still needs
a light model (`llama-3.1-8b-instant`) to avoid 429-walling.

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
- **Topic collections** (`/topic/<slug>`) are a saved TITLE search, not a
  DB category: a keyword list in `web/lib/topics.ts` + the `titleKeywords`
  filter in `data.ts`. No schema change; grows as videos sync.
- `videos` has `view_count` (popularity) and a generated `search_tsv`
  (full-text GIN index). New search should use FTS, not `title ILIKE`.
- Queries must stay bounded (`limit`/`range`) — free-tier discipline.
- **Brand mark**: the Thousand-Petal Lotus, "Concept A — Thousand-Petal
  Bloom" (owner-chosen; Brahma-samhita 5.2). Two offset petal rings (8
  outer + 8 inner at 22.5°) around a hexagonal saffron pericarp, in a
  **fixed gold-gradient palette** (NOT currentColor) so it reads on both
  the black top bar and white pages. One source of truth for geometry:
  `web/components/icons/logo-mark.tsx`, mirrored with the same colors in
  `web/app/icon.svg` and `web/public/icons/icon.svg` (the maskable icon
  scales the lotus to 0.9 for the safe zone). If the mark changes, update
  all three SVGs and re-run the icon script. (A Krishna-flute photo emblem
  was tried and rejected; alternatives + rationale in `docs/logo-concepts/`.)

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

1. **Plan first, then WAIT for the owner's explicit "implement"** before
   writing or running any code — a hard rule he enforces. The plan: goal,
   exact components/files, constraints, how success is verified. Update
   docs/DESIGN.md first if the design changes. Ask the owner only about
   genuine product decisions.
2. **Build in the main session**, reading only the files needed.
3. **Verify** = `npm run build` + `npm run lint` + the owner smoke-testing
   in the browser. The owner is the design reviewer — ship, let him look,
   iterate on his feedback.
4. **Report** in plain language, teaching as you go (see Owner context).

Do NOT spawn subagents — even the `code-reviewer` — unless a task
genuinely requires it or the owner asks; default to doing everything
inline in the main session. Commit only when the owner asks.

## Owner context

The owner (Sanjay) has strong Python, is learning React/Next.js and SQL.
Frontend code should be simple and idiomatic — it doubles as his learning
material. Explanations in reports should teach, not just inform.
