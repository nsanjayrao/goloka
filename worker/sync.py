"""Goloka sync worker.

Fetches new videos from the curated YouTube channels in channels.json,
classifies them (keyword rules first, optional Groq LLM fallback), and
upserts channel + video metadata into Supabase. Idempotent: safe to re-run.

Usage:
    python sync.py            # incremental: newest ~100 videos per channel
    python sync.py --full     # backfill: up to ~1000 videos per channel
    python sync.py --enrich   # re-process EXISTING rows: refresh view_count
                              #   and re-run classification (no channel fetch)
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from supabase import create_client

# Channel/video titles routinely contain Devanagari, Bengali, Tamil, etc.
# (this catalog is full of them). Windows' default console codec (cp1252)
# can't encode that and crashes on a plain print() - reconfigure stdout to
# UTF-8 so logging never depends on the terminal's locale. GitHub Actions'
# Linux runner is already UTF-8, so this is a no-op there.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

YT_API = "https://www.googleapis.com/youtube/v3"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
# Videos classified per Groq call. Batching (vs one call per video) is what
# keeps a big backfill under Groq's rate limit - one 429 wall last time was
# caused by ~900 single-video calls per channel.
GROQ_BATCH = 15
# `--no-llm` skips the Groq classifier (regex + fallback only). Use it for a
# fast enrich pass that fills view_count + regex categories without fighting
# Groq's per-minute free-tier limit; run plain `--enrich` later for the LLM
# pass once you can pace it.
USE_LLM = "--no-llm" not in sys.argv

CATEGORIES = [
    "Lectures",
    "Kirtans & Bhajans",
    "Festivals",
    "Documentaries",
    "Prasadam & Cooking",
    "Kids",
    "General",
]

# Videos hand-reviewed as off-topic for a devotional content hub (pure
# news/politics/clickbait, no devotional content) - removed once (2026-07-05)
# and denylisted here so a re-sync doesn't re-add them from the channel's
# still-current uploads. This is a precise, hand-reviewed list by ID rather
# than a keyword filter on purpose: a channel like Hare Krsna TV also runs a
# legitimate "spiritual commentary on current events" genre (e.g. "does this
# war show Kali-yuga signs?") that the owner wants KEPT, and it shares the same
# vocabulary (war, politics, named public figures) as the pure-news videos
# that don't belong here - a keyword regex can't tell the two apart without
# false-positiving on the genre we want to keep, so add future offenders here
# by ID after a manual look, not by broadening a keyword list.
EXCLUDED_VIDEO_IDS = {
    "D4Vf7eYHhU8",  # "Epstein Files..." - news/conspiracy commentary, no devotional content
    "T2XswsSguXU",  # "Trump ATTACKED at White House" - pure political news
    "ufDog3yF8AM",  # "Viral..." 120 km/h clickbait, unrelated to the catalog
    "UBivDgFk8iQ",  # "Will Donald Trump's name be immortal in history?" - political speculation
}

# Checked in order, first match wins - keep the most specific/leftmost intent
# first. Deliberately avoids over-broad terms like a bare "krishna"/"hare
# krishna" that appear in nearly every title.
CATEGORY_RULES = [
    (re.compile(r"kirtan|bhajan|maha[- ]?mantra|\bchant|harinam|sankirtan|abhang|aarti|arati|\bdhun\b", re.I), "Kirtans & Bhajans"),
    (re.compile(r"lecture|\bclass\b|bhagavatam|bhagavad[- ]?gita|\bgita\b|katha|seminar|pravachan|pravacana|discourse|srimad|teachings|philosophy|\bsb\s?\d|\bbg\s?\d", re.I), "Lectures"),
    (re.compile(r"ratha?[- ]?yatra|janmashtami|janmastami|gaura[- ]?purnima|radha?[- ]?ashtami|radhastami|ekadashi|festival|\bkartik\b|damodara|govardhan|nrsimha|nrisimha|narasimha|jhulan|vyasa[- ]?puja|appearance day|disappearance day|tirobhava|\bholi\b|diwali|deepotsav|balaram[a]?[- ]?purnima|nityananda[- ]?trayodashi", re.I), "Festivals"),
    (re.compile(r"documentary|biography|life story|history of|the story of", re.I), "Documentaries"),
    (re.compile(r"prasadam|prasad\b|recipe|cooking|\bcook\b|kitchen|laddu|halava|halwa|khichdi|khichuri|sabji|subji|\bsweet\b|bhoga|naivedya", re.I), "Prasadam & Cooking"),
    (re.compile(r"\bkids\b|children|cartoon|animat|little krishna|for kids|nursery", re.I), "Kids"),
]


def yt_get(endpoint: str, **params) -> dict:
    params["key"] = YOUTUBE_API_KEY
    # A `--full` backfill makes hundreds of paginated calls; a single dropped
    # connection (seen in practice: WinError 10054 mid-run) otherwise kills the
    # whole sync. 3 attempts with a short linear backoff is enough for a
    # transient network blip without masking a real, persistent failure.
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            resp = requests.get(f"{YT_API}/{endpoint}", params=params, timeout=30)
            break
        except requests.exceptions.RequestException as exc:
            last_exc = exc
            if attempt < 2:
                print(f"    yt_get {endpoint} network error, retrying: {exc}")
                time.sleep(2 * (attempt + 1))
    else:
        raise last_exc
    if resp.status_code != 200:
        raise RuntimeError(f"YouTube API {endpoint} failed ({resp.status_code}): {resp.text[:500]}")
    return resp.json()


def resolve_channel(entry: dict) -> dict:
    """Resolve a channels.json entry (handle or id) to full channel info."""
    params = {"part": "snippet,contentDetails"}
    if entry.get("youtube_channel_id"):
        params["id"] = entry["youtube_channel_id"]
    else:
        params["forHandle"] = entry["handle"].lstrip("@")
    data = yt_get("channels", **params)
    items = data.get("items", [])
    if not items:
        raise RuntimeError(f"Channel not found on YouTube: {entry}")
    ch = items[0]
    return {
        "youtube_channel_id": ch["id"],
        "handle": entry.get("handle"),
        "title": ch["snippet"]["title"],
        "thumbnail_url": ch["snippet"]["thumbnails"].get("medium", {}).get("url"),
        "uploads_playlist": ch["contentDetails"]["relatedPlaylists"]["uploads"],
        "default_category": entry.get("default_category", "General"),
    }


def fetch_playlist_videos(playlist_id: str, max_pages: int) -> list[dict]:
    videos, page_token = [], None
    for _ in range(max_pages):
        params = {"part": "snippet,contentDetails", "playlistId": playlist_id, "maxResults": 50}
        if page_token:
            params["pageToken"] = page_token
        data = yt_get("playlistItems", **params)
        for item in data.get("items", []):
            snippet = item["snippet"]
            videos.append({
                "youtube_video_id": item["contentDetails"]["videoId"],
                "title": snippet["title"],
                "description": (snippet.get("description") or "")[:2000],
                "published_at": item["contentDetails"].get("videoPublishedAt") or snippet.get("publishedAt"),
                "thumbnail_url": (snippet.get("thumbnails") or {}).get("medium", {}).get("url"),
            })
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return videos


# Owner decision 2026-07-05: Goloka indexes videos, not Shorts/reels. YouTube
# Shorts don't carry an explicit flag from the videos.list API (only duration
# and, often, a "#shorts" tag the creator adds), so this is a best-effort
# detector, not a certainty - matches YouTube's own Shorts window (originally
# 60s, expanded to 3 min in 2024). A rare non-Short video under 3 minutes
# could still be caught by this; there's no way to fully rule that out with
# the data the API exposes.
SHORTS_MAX_SECONDS = 180


def is_short(title: str, duration_seconds: int | None) -> bool:
    if "#shorts" in title.lower():
        return True
    return duration_seconds is not None and duration_seconds < SHORTS_MAX_SECONDS


def parse_iso_duration(iso: str) -> int | None:
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return None
    h, mi, s = (int(g) if g else 0 for g in m.groups())
    return h * 3600 + mi * 60 + s


def fetch_video_details(video_ids: list[str]) -> dict[str, dict]:
    """Duration + view count for each id, from the videos endpoint (one call
    per 50 ids). Returns {id: {"duration": int|None, "view_count": int|None}}."""
    details: dict[str, dict] = {}
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i + 50]
        data = yt_get("videos", part="contentDetails,statistics", id=",".join(batch), maxResults=50)
        for item in data.get("items", []):
            views = item.get("statistics", {}).get("viewCount")
            details[item["id"]] = {
                "duration": parse_iso_duration(item.get("contentDetails", {}).get("duration", "")),
                "view_count": int(views) if views is not None and str(views).isdigit() else None,
            }
    return details


def classify_with_rules(title: str, description: str) -> str | None:
    text = f"{title}\n{description[:300]}"
    for pattern, category in CATEGORY_RULES:
        if pattern.search(text):
            return category
    return None


def classify_batch_with_groq(items: list[dict]) -> list[dict | None]:
    """Classify a BATCH of videos in one Groq call, with exponential backoff on
    429. `items` = [{"title","description"}]. Returns a list aligned by index,
    each {"category","language"} or None. Tagging is best-effort - any failure
    returns None for the whole batch and the caller falls back."""
    if not GROQ_API_KEY or not USE_LLM or not items:
        return [None] * len(items)

    numbered = "\n".join(
        f'{i}. {it["title"]} :: {(it.get("description") or "")[:160]}'
        for i, it in enumerate(items)
    )
    prompt = (
        "Classify each ISKCON/Krishna-consciousness YouTube video below. For "
        f"each, pick one category from {CATEGORIES} and its main spoken language "
        "(or null).\n\n"
        f"{numbered}\n\n"
        'Reply with JSON only: {"results": [{"i": <index>, "category": <category>, '
        '"language": <language or null>}, ...]} covering every index.'
    )

    for attempt in range(5):
        try:
            resp = requests.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "User-Agent": "Mozilla/5.0"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                },
                timeout=60,
            )
            if resp.status_code == 429:
                wait = 2 ** attempt
                print(f"    groq 429 - backing off {wait}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = json.loads(resp.json()["choices"][0]["message"]["content"])
            out: list[dict | None] = [None] * len(items)
            for row in data.get("results", []):
                idx = row.get("i")
                if isinstance(idx, int) and 0 <= idx < len(items) and row.get("category") in CATEGORIES:
                    # The model often returns the literal string "null"/"none"
                    # for unknown language - store a real None instead.
                    lang = row.get("language")
                    if isinstance(lang, str) and lang.strip().lower() in ("null", "none", "n/a", "unknown", ""):
                        lang = None
                    out[idx] = {"category": row["category"], "language": lang}
            return out
        except Exception as exc:  # never fail the sync over tagging
            print(f"    groq batch skipped: {exc}")
            return [None] * len(items)
    print("    groq batch gave up after retries")
    return [None] * len(items)


def classify_videos(videos: list[dict], fallbacks: list[str]) -> list[dict]:
    """Per-video {"category","language"}: regex rules first, then batched Groq
    for the misses, then `fallbacks[i]` for anything still unclassified."""
    results = [{"category": None, "language": None} for _ in videos]
    to_llm: list[dict] = []
    llm_idx: list[int] = []
    for i, v in enumerate(videos):
        cat = classify_with_rules(v["title"], v.get("description") or "")
        if cat:
            results[i]["category"] = cat
        else:
            to_llm.append(v)
            llm_idx.append(i)

    for start in range(0, len(to_llm), GROQ_BATCH):
        chunk = to_llm[start:start + GROQ_BATCH]
        for j, tag in enumerate(classify_batch_with_groq(chunk)):
            if tag:
                target = llm_idx[start + j]
                results[target]["category"] = tag["category"]
                results[target]["language"] = tag["language"]
        time.sleep(0.5)  # be gentle between batches

    for i, r in enumerate(results):
        if not r["category"]:
            r["category"] = fallbacks[i]
    return results


def enrich(db) -> None:
    """One-time (resumable) pass over EXISTING rows: refresh view_count and
    re-run the improved classification. Never downgrades a category it can't
    improve, and keeps an existing language if it can't produce a new one.
    Idempotent - safe to re-run / resume if Groq's daily cap is hit."""
    page_size = 500
    offset, total = 0, 0
    while True:
        page = (db.table("videos")
                .select("id, youtube_video_id, title, description, category, language")
                .order("id")
                .range(offset, offset + page_size - 1)
                .execute())
        rows = page.data or []
        if not rows:
            break
        print(f"enrich: rows {offset}..{offset + len(rows) - 1}")

        details = fetch_video_details([r["youtube_video_id"] for r in rows])
        videos = [{"title": r["title"], "description": r.get("description") or ""} for r in rows]
        # Fallback = the row's CURRENT category, so classification never downgrades.
        tags = classify_videos(videos, [r["category"] for r in rows])

        updates = []
        for r, tag in zip(rows, tags):
            d = details.get(r["youtube_video_id"], {})
            updates.append({
                # Upsert-on-conflict UPDATEs the existing row - but Postgres
                # validates the would-be-INSERTed row's NOT NULLs before the
                # conflict redirects to UPDATE, so `title` MUST be included or
                # it fails on title's NOT NULL. (`id` is GENERATED ALWAYS and
                # can't be sent.)
                "title": r["title"],
                "youtube_video_id": r["youtube_video_id"],
                "category": tag["category"],
                "language": tag["language"] or r.get("language"),
                "view_count": d.get("view_count"),
            })
        db.table("videos").upsert(updates, on_conflict="youtube_video_id").execute()
        total += len(updates)
        offset += page_size

    print(f"Enrich done. {total} row(s) refreshed.")


def main() -> None:
    missing = [k for k, v in {
        "YOUTUBE_API_KEY": YOUTUBE_API_KEY,
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY,
    }.items() if not v]
    if missing:
        sys.exit(f"Missing environment variables: {', '.join(missing)} (see .env.example)")

    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    if "--enrich" in sys.argv:
        enrich(db)
        return

    full = "--full" in sys.argv
    max_pages = 20 if full else 2

    channels_file = Path(__file__).resolve().parent / "channels.json"
    entries = [e for e in json.loads(channels_file.read_text(encoding="utf-8"))
               if "REPLACE-ME" not in json.dumps(e)]
    if not entries:
        sys.exit("channels.json has no real channels yet - add at least one @handle.")

    total_new = 0

    for entry in entries:
        # One unreachable/renamed channel shouldn't abort the whole run.
        try:
            info = resolve_channel(entry)
        except Exception as exc:
            print(f"Channel skipped ({entry.get('handle') or entry.get('youtube_channel_id')}): {exc}")
            continue
        uploads = info.pop("uploads_playlist")
        default_category = info["default_category"]
        print(f"Channel: {info['title']} ({info['youtube_channel_id']})")

        db.table("channels").upsert(info, on_conflict="youtube_channel_id").execute()
        row = (db.table("channels").select("id")
               .eq("youtube_channel_id", info["youtube_channel_id"])
               .single().execute())
        channel_pk = row.data["id"]

        videos = fetch_playlist_videos(uploads, max_pages)
        if not videos:
            print("    no videos found")
            continue

        existing = (db.table("videos").select("youtube_video_id")
                    .eq("channel_id", channel_pk).execute())
        known_ids = {r["youtube_video_id"] for r in existing.data}
        new_videos = [
            v for v in videos
            if v["youtube_video_id"] not in known_ids
            and v["youtube_video_id"] not in EXCLUDED_VIDEO_IDS
            # Cheap pre-filter on the "#shorts" tag alone (duration isn't
            # known yet - that's the second filter below, after fetching it).
            and not is_short(v["title"], None)
        ]
        print(f"    fetched {len(videos)}, new {len(new_videos)}")
        if not new_videos:
            continue

        details = fetch_video_details([v["youtube_video_id"] for v in new_videos])
        # Goloka indexes videos, not Shorts/reels (owner decision 2026-07-05) -
        # duration is only known now, so this is where the real cutoff applies.
        new_videos = [
            v for v in new_videos
            if not is_short(v["title"], details.get(v["youtube_video_id"], {}).get("duration"))
        ]
        if not new_videos:
            continue
        tags = classify_videos(new_videos, [default_category] * len(new_videos))
        rows = []
        for v, tag in zip(new_videos, tags):
            d = details.get(v["youtube_video_id"], {})
            rows.append({
                **v,
                "channel_id": channel_pk,
                "duration_seconds": d.get("duration"),
                "view_count": d.get("view_count"),
                "category": tag["category"],
                "language": tag["language"],
            })

        db.table("videos").upsert(rows, on_conflict="youtube_video_id").execute()
        total_new += len(rows)

    print(f"Done. {total_new} new video(s) synced.")


if __name__ == "__main__":
    main()
