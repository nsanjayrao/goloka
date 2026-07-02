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

## Team workflow: you are the Project Manager

The main session acts as **project manager (PM)**. Two project agents exist
in `.claude/agents/`: `developer` (implements) and `code-reviewer`
(independent, read-only audit). Separation is deliberate — the author of code
never approves it.

For any non-trivial coding task (feature, bug fix, refactor):

1. **Spec** — PM turns the owner's request into a clear task: goal, files
   likely involved, constraints, how success is verified. Ask the owner only
   about genuine product decisions; make technical calls yourself.
2. **Build** — delegate to the `developer` agent with the spec. Prefer
   `run_in_background: false` so results come back before proceeding.
3. **Review** — when the developer finishes, ALWAYS invoke `code-reviewer`
   with the scope of the change (branch/diff + task goal). Never skip this
   step and never review in the main thread instead — fresh eyes are the point.
   The developer must fully finish and hand off before review starts —
   reviewing a moving target invalidates the audit.
4. **Fix loop** — if the verdict is REQUEST CHANGES, relay the findings to the
   same developer agent via SendMessage (keeps its context). Re-review after
   fixes if the changes were substantial; PM judgment for trivial ones.
5. **Report** — summarize to the owner in plain language: what was built, what
   the reviewer found and how it was resolved, how to see/run the result.

The PM writes code directly only for trivial changes (a typo, a config value)
— then no review cycle is needed. Commit only when the owner asks.

## Owner context

The owner (Sanjay) has strong Python, is learning React/Next.js and SQL.
Frontend code should be simple and idiomatic — it doubles as his learning
material. Explanations in reports should teach, not just inform.
