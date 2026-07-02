# Goloka 🛕

One centralized, beautifully structured home for ISKCON content — lectures,
kirtans, festivals, and more — auto-updated from official sources.

**Core principle: Goloka is an index, never a host.** Videos play through the
standard YouTube embedded player; books, products, and audio link out to their
official sources. We store metadata only — no media files, ever.

## Architecture

```
YouTube channels (curated list)
        │  every 6 hours (GitHub Actions cron)
        ▼
worker/sync.py  ──  fetch new videos → classify (rules → optional Groq LLM) → upsert
        │
        ▼
Supabase (Postgres, free tier)  ──  metadata only: titles, URLs, categories, tags
        │
        ▼
Next.js on Vercel (free tier)  ──  responsive PWA, YouTube embeds   (web/ — live at goloka-three.vercel.app)
```

## Setup (one time)

1. **Supabase**: create a free project at supabase.com → open SQL Editor →
   paste and run `db/schema.sql`.
2. **YouTube API key**: console.cloud.google.com → create a project (no billing
   needed) → APIs & Services → enable **YouTube Data API v3** → Credentials →
   Create API key.
3. **Configure**: copy `.env.example` to `.env` and fill in the values.
4. **Curate channels**: edit `worker/channels.json` — one entry per channel,
   using the `@handle` from the channel's YouTube URL. Suggested channels to
   look up: ISKCON Desire Tree, Mayapur TV, your local temple's channel,
   favourite kirtan artists.
5. **Install & run**:
   ```
   pip install -r worker/requirements.txt
   python worker/sync.py --full     # first run: backfill
   python worker/sync.py            # afterwards: incremental
   ```
6. **Automate**: push to GitHub → repo Settings → Secrets and variables →
   Actions → add `YOUTUBE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   (and optionally `GROQ_API_KEY`). The workflow in
   `.github/workflows/sync.yml` then syncs every 6 hours automatically.

## Roadmap

- [x] Phase 1a — data pipeline: schema, sync worker, auto-classification, cron
- [x] Phase 1b — Next.js frontend: browse by category, search, YouTube embeds, PWA
- [ ] Phase 2 — speaker/artist pages, filters (language, duration), playlists
- [ ] Phase 3 — books & products directory (link-outs), temple directory
- [ ] Phase 4 — accounts: favourites, watch-later (Supabase auth)
