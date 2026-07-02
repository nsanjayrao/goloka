"""Goloka sync worker.

Fetches new videos from the curated YouTube channels in channels.json,
classifies them (keyword rules first, optional Groq LLM fallback), and
upserts channel + video metadata into Supabase. Idempotent: safe to re-run.

Usage:
    python sync.py           # incremental: newest ~100 videos per channel
    python sync.py --full    # backfill: up to ~1000 videos per channel
"""

import json
import os
import re
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

YT_API = "https://www.googleapis.com/youtube/v3"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

CATEGORIES = [
    "Lectures",
    "Kirtans & Bhajans",
    "Festivals",
    "Documentaries",
    "Prasadam & Cooking",
    "Kids",
    "General",
]

CATEGORY_RULES = [
    (re.compile(r"kirtan|bhajan|maha[- ]?mantra|chant", re.I), "Kirtans & Bhajans"),
    (re.compile(r"lecture|class|bhagavatam|bhagavad[- ]?gita|katha|seminar|pravachan", re.I), "Lectures"),
    (re.compile(r"ratha[- ]?yatra|janmashtami|gaura[- ]?purnima|radhashtami|ekadashi|festival|kartik|damodara", re.I), "Festivals"),
    (re.compile(r"documentary|history of|the story of", re.I), "Documentaries"),
    (re.compile(r"prasadam|recipe|cooking|kitchen", re.I), "Prasadam & Cooking"),
    (re.compile(r"\bkids\b|children|cartoon|animated", re.I), "Kids"),
]


def yt_get(endpoint: str, **params) -> dict:
    params["key"] = YOUTUBE_API_KEY
    resp = requests.get(f"{YT_API}/{endpoint}", params=params, timeout=30)
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


def parse_iso_duration(iso: str) -> int | None:
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return None
    h, mi, s = (int(g) if g else 0 for g in m.groups())
    return h * 3600 + mi * 60 + s


def fetch_durations(video_ids: list[str]) -> dict[str, int | None]:
    durations = {}
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i + 50]
        data = yt_get("videos", part="contentDetails", id=",".join(batch), maxResults=50)
        for item in data.get("items", []):
            durations[item["id"]] = parse_iso_duration(item["contentDetails"].get("duration", ""))
    return durations


def classify_with_rules(title: str, description: str) -> str | None:
    text = f"{title}\n{description[:300]}"
    for pattern, category in CATEGORY_RULES:
        if pattern.search(text):
            return category
    return None


def classify_with_groq(title: str, description: str) -> dict | None:
    """Optional LLM fallback. Returns {"category": ..., "language": ...} or None."""
    if not GROQ_API_KEY:
        return None
    prompt = (
        "Classify this ISKCON/Krishna-consciousness YouTube video.\n"
        f'Title: {title}\nDescription: {description[:400]}\n\n'
        f'Reply with JSON only: {{"category": <one of {CATEGORIES}>, "language": <main spoken language or null>}}'
    )
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
            timeout=30,
        )
        resp.raise_for_status()
        result = json.loads(resp.json()["choices"][0]["message"]["content"])
        if result.get("category") in CATEGORIES:
            return result
    except Exception as exc:  # tagging is best-effort; never fail the sync over it
        print(f"    groq tagging skipped: {exc}")
    return None


def main() -> None:
    missing = [k for k, v in {
        "YOUTUBE_API_KEY": YOUTUBE_API_KEY,
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": SUPABASE_SERVICE_KEY,
    }.items() if not v]
    if missing:
        sys.exit(f"Missing environment variables: {', '.join(missing)} (see .env.example)")

    full = "--full" in sys.argv
    max_pages = 20 if full else 2

    channels_file = Path(__file__).resolve().parent / "channels.json"
    entries = [e for e in json.loads(channels_file.read_text(encoding="utf-8"))
               if "REPLACE-ME" not in json.dumps(e)]
    if not entries:
        sys.exit("channels.json has no real channels yet - add at least one @handle.")

    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    total_new = 0

    for entry in entries:
        info = resolve_channel(entry)
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
        new_videos = [v for v in videos if v["youtube_video_id"] not in known_ids]
        print(f"    fetched {len(videos)}, new {len(new_videos)}")
        if not new_videos:
            continue

        durations = fetch_durations([v["youtube_video_id"] for v in new_videos])
        rows = []
        for v in new_videos:
            category = classify_with_rules(v["title"], v["description"])
            language = None
            if category is None:
                llm = classify_with_groq(v["title"], v["description"])
                if llm:
                    category, language = llm["category"], llm.get("language")
            rows.append({
                **v,
                "channel_id": channel_pk,
                "duration_seconds": durations.get(v["youtube_video_id"]),
                "category": category or default_category,
                "language": language,
            })

        db.table("videos").upsert(rows, on_conflict="youtube_video_id").execute()
        total_new += len(rows)

    print(f"Done. {total_new} new video(s) synced.")


if __name__ == "__main__":
    main()
