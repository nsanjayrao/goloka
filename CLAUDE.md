# CLAUDE.md — Goloka

Goloka is a free, centralized ISKCON content hub. **Index, never host**:
metadata only, YouTube embeds, link-outs — no media files, ever. Everything
runs on free tiers (Vercel, Supabase, GitHub Actions, YouTube Data API,
optional Groq). See README.md for architecture and setup.

**All frontend/UI work MUST follow `docs/DESIGN.md`** — it is the binding
design spec (colors, typography, layouts, motion, page specs). The
code-reviewer treats deviations from it as findings.

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

## Running the worker

```
pip install -r worker/requirements.txt
python worker/sync.py          # incremental sync
python worker/sync.py --full   # deep backfill
```

Requires `.env` (copy `.env.example`): YOUTUBE_API_KEY, SUPABASE_URL,
SUPABASE_SERVICE_KEY, optional GROQ_API_KEY.
