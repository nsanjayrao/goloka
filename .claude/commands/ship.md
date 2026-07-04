---
description: Plan → build → verify loop, all in the main session (no agents)
---

Task: $ARGUMENTS

Execute this loop, entirely in the main session — never spawn subagents or
orchestrate:

1. **PLAN (≤ 10 lines, before any code).** Goal, exact files to touch,
   design calls (cite docs/DESIGN.md sections), and how success will be
   verified. If a genuine PRODUCT decision is open, ask me exactly one
   question; technical decisions are yours — pick and state them.
2. **BUILD.** Read only the files you must. Follow CLAUDE.md conventions
   (data reads in web/lib/data.ts behind safely(), bounded queries, ISR
   untouched, next/image, no new dependencies without asking). Comments
   teach the non-obvious, nothing else.
3. **VERIFY.** `npm run build` + `npm run lint` in web/ must pass; smoke
   the affected routes on the dev server. Report results honestly —
   failures included, verbatim.
4. **REPORT (≤ 15 lines) then STOP.** What changed, how I can see it, one
   thing worth learning from it. No committing, no extra polish passes.
   I review in the browser and reply with feedback; you apply feedback as
   a targeted diff — never a rewrite — and re-verify. Loop until I say done.

Token discipline: never re-read unchanged files, never re-explain settled
decisions, no speculative refactors, no summaries longer than asked.
