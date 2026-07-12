"""Goloka sync worker.

Fetches new videos from the curated YouTube channels in channels.json,
classifies them (keyword rules first, then an LLM pass that fails over
Groq -> NVIDIA when a free tier rate-limits), tags them with topic slugs
(the /topic/* collections), and upserts channel + video metadata into
Supabase. Idempotent: safe to re-run.

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
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "")

YT_API = "https://www.googleapis.com/youtube/v3"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
# Owner-chosen (2026-07-13): GLM on NVIDIA's free NIM tier. Verified on the
# real classification prompt: correct JSON (inside ```json fences - the
# parser strips them), and it passed both precision traps (no "radharani"
# for a title containing "aradhana" or a mere deity-name mention).
# meta/llama-3.1-8b-instruct also works if this model is ever retired;
# meta/llama-3.3-70b-instruct queue-timed-out when tested - avoid.
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "z-ai/glm-5.2")
# Videos classified per LLM call. Batching (vs one call per video) is what
# keeps a big backfill under the free-tier rate limits - one 429 wall last
# time was caused by ~900 single-video calls per channel.
LLM_BATCH = 15
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


# Topic collections (/topic/<slug>). Slugs MUST mirror web/lib/topics.ts -
# the frontend queries `tags` for exactly these strings. The description is
# what the LLM judges against; phrasing matters (the old title-substring
# approach tagged every "aradhana"/deity-name mention as Radharani - the
# LLM is specifically told not to).
TOPIC_DEFS = {
    "radharani": (
        "Srimati Radharani herself - her glories, pastimes, Radhastami; "
        "NOT videos that merely mention Radha in a deity or temple name"
    ),
    "vrindavan": "the holy dham of Vrindavan - parikrama, its temples and pastime places",
    "gita": "Bhagavad-gita teaching - a class on its verses or philosophy",
    "janmashtami": "Sri Krishna Janmashtami - Krishna's appearance day celebrations",
    "nrsimha": "Lord Nrsimhadeva - his pastimes, prayers, Nrsimha Chaturdashi",
}

# High-precision word patterns per topic - the floor the LLM builds on (its
# judgments are unioned with these). Deliberately narrow: "radharani" needs
# the full name / Radhastami / Barsana, never a bare "radha" substring
# (which used to false-positive on "aradhana"). "radhika"/"राधिका" is NOT
# here on purpose: it appears constantly in SPEAKER names ("Radhika Vallabh
# Prabhu", "Radhika Devi Dasi") - name-vs-subject is exactly the judgment
# call that belongs to the LLM, not a regex.
TOPIC_RULES = {
    "radharani": re.compile(r"radharani|radh[ae][\s-]*a?shtami|radhastami|\bkishori\b|\bbarsana\b|राधारानी|राधाष्टमी", re.I),
    "vrindavan": re.compile(r"vrindavan|vrndavan|brindavan|वृन्दावन|वृंदावन", re.I),
    "gita": re.compile(r"bhagavad[\s-]*gita|bhagavadgita|\bgita\b|भगवद्[\s-]*गीता", re.I),
    "janmashtami": re.compile(r"janmashtami|janmastami|gokulashtami|जन्माष्टमी", re.I),
    "nrsimha": re.compile(r"nrsimha|narasimha|nrisimha|nrisingha|नृसिंह|नरसिंह", re.I),
}


def topics_from_rules(title: str, description: str) -> set[str]:
    text = f"{title}\n{description[:300]}"
    return {slug for slug, pattern in TOPIC_RULES.items() if pattern.search(text)}


# Groq returns the spoken language as free text ("English", "en", "Hindi",
# "hindi", "hi", even typos like "Bangali") - normalizing at write time is what
# makes a language FILTER usable later; without this, "English" and "en" would
# show up as two separate filter chips for the same language.
LANGUAGE_ALIASES = {
    "en": "English", "eng": "English", "english": "English",
    "hi": "Hindi", "hin": "Hindi", "hindi": "Hindi",
    "bn": "Bengali", "ben": "Bengali", "bengali": "Bengali", "bangali": "Bengali", "bangla": "Bengali",
    "ta": "Tamil", "tam": "Tamil", "tamil": "Tamil",
    "te": "Telugu", "tel": "Telugu", "telugu": "Telugu",
    "gu": "Gujarati", "guj": "Gujarati", "gujarati": "Gujarati",
    "mr": "Marathi", "mar": "Marathi", "marathi": "Marathi",
    "kn": "Kannada", "kan": "Kannada", "kannada": "Kannada",
    "ml": "Malayalam", "mal": "Malayalam", "malayalam": "Malayalam",
    "pa": "Punjabi", "pan": "Punjabi", "punjabi": "Punjabi",
    "or": "Odia", "ori": "Odia", "odia": "Odia", "oriya": "Odia",
    "es": "Spanish", "spanish": "Spanish",
    "pt": "Portuguese", "portuguese": "Portuguese",
    "ru": "Russian", "russian": "Russian",
    "fr": "French", "french": "French",
    "de": "German", "german": "German",
    "sa": "Sanskrit", "sanskrit": "Sanskrit",
}


def normalize_language(lang: str | None) -> str | None:
    if not lang or not isinstance(lang, str):
        return None
    key = lang.strip().lower()
    if key in ("null", "none", "n/a", "unknown", ""):
        return None
    # Fall back to title-casing whatever the model returned, so even a
    # language missing from the alias table above still gets consistent
    # casing instead of a raw, unpredictable string.
    return LANGUAGE_ALIASES.get(key, lang.strip().title())


# The LLM providers, tried in order. Both speak the OpenAI chat-completions
# dialect, so one request/parse path serves both. `json_mode` - Groq's
# response_format is reliable; NVIDIA's varies by model (it hung a queued
# model when tested), so NVIDIA gets prompt-enforced JSON + the tolerant
# extractor below instead.
def _providers() -> list[dict]:
    providers = []
    if GROQ_API_KEY:
        providers.append({"name": "groq", "url": GROQ_URL, "key": GROQ_API_KEY,
                          "model": GROQ_MODEL, "json_mode": True})
    if NVIDIA_API_KEY:
        providers.append({"name": "nvidia", "url": NVIDIA_URL, "key": NVIDIA_API_KEY,
                          "model": NVIDIA_MODEL, "json_mode": False})
    return providers


PROVIDERS = _providers()
# Sticky failover: once a provider 429-walls, later batches START from the
# next one instead of re-hitting the exhausted tier on every batch. It gets
# another chance naturally when the other provider fails or the run ends.
_preferred_provider = 0


def _extract_json(text: str) -> dict:
    """Parse a JSON object out of an LLM reply that may wrap it in ```json
    fences or prose (GLM does) - everything outside the outermost braces is
    ignored."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError(f"no JSON object in LLM reply: {text[:120]!r}")
    return json.loads(text[start:end + 1])


def _echo_matches(echo: str, title: str) -> bool:
    """True when the LLM's echoed title-start really is this video's title.
    Batch models occasionally shift results one index over - seen in
    practice tagging 'Neurological Disorders: An Ayurvedic Perspective' as
    Radharani content - so every row must prove it's talking about ITS
    video. Comparison ignores case/whitespace/punctuation (the echo often
    normalizes quotes or drops a pipe)."""
    e = re.sub(r"\W+", "", echo or "").lower()
    t = re.sub(r"\W+", "", title or "").lower()
    return bool(e) and t.startswith(e[:16])


def classify_batch_with_llm(items: list[dict]) -> list[dict | None]:
    """Classify a BATCH of videos in one LLM call, failing over between
    providers (Groq -> NVIDIA) on 429s/errors. `items` = [{"title",
    "description"}]. Returns a list aligned by index, each {"category",
    "language", "topics"} or None. Best-effort - if every provider fails,
    the whole batch returns None and the caller falls back."""
    global _preferred_provider
    if not PROVIDERS or not USE_LLM or not items:
        return [None] * len(items)

    numbered = "\n".join(
        f'{i}. {it["title"]} :: {(it.get("description") or "")[:160]}'
        for i, it in enumerate(items)
    )
    topic_lines = "\n".join(f'- "{slug}": {desc}' for slug, desc in TOPIC_DEFS.items())
    prompt = (
        "Classify each ISKCON/Krishna-consciousness YouTube video below. For each, give:\n"
        '- "t": the first few words of that video\'s title, copied verbatim\n'
        f'- "category": one of {CATEGORIES}\n'
        '- "language": its main spoken language, or null\n'
        '- "topics": which of these the video is PRIMARILY about - 0 to 3 of:\n'
        f"{topic_lines}\n"
        "A person's NAME containing Radha/Radhika/Vrindavan does not make the video about that topic.\n\n"
        f"{numbered}\n\n"
        'Reply with JSON only: {"results": [{"i": <index>, "t": <title start>, '
        '"category": <category>, "language": <language or null>, "topics": [<slugs>]}, ...]} '
        "covering every index."
    )

    for offset in range(len(PROVIDERS)):
        p = PROVIDERS[(_preferred_provider + offset) % len(PROVIDERS)]
        for attempt in range(4):
            try:
                body = {
                    "model": p["model"],
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                    "max_tokens": 2048,
                }
                if p["json_mode"]:
                    body["response_format"] = {"type": "json_object"}
                resp = requests.post(
                    p["url"],
                    headers={"Authorization": f"Bearer {p['key']}", "User-Agent": "Mozilla/5.0"},
                    json=body,
                    timeout=90,
                )
                if resp.status_code == 429:
                    wait = 2 ** attempt
                    print(f"    {p['name']} 429 - backing off {wait}s")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                data = _extract_json(resp.json()["choices"][0]["message"]["content"])
                out: list[dict | None] = [None] * len(items)
                mismatches = 0
                for row in data.get("results", []):
                    idx = row.get("i")
                    if not (isinstance(idx, int) and 0 <= idx < len(items)):
                        continue
                    # Echo check: the row must prove it's about ITS video.
                    # A row with a wrong/missing echo is discarded (that video
                    # just gets no LLM verdict) rather than trusted - a
                    # misaligned verdict is worse than none.
                    if not _echo_matches(row.get("t") or "", items[idx]["title"]):
                        mismatches += 1
                        continue
                    raw_topics = row.get("topics") or []
                    out[idx] = {
                        "category": row.get("category") if row.get("category") in CATEGORIES else None,
                        "language": normalize_language(row.get("language")),
                        "topics": [t for t in raw_topics if t in TOPIC_DEFS],
                    }
                if mismatches:
                    print(f"    {p['name']}: dropped {mismatches}/{len(items)} rows on echo mismatch")
                return out
            except Exception as exc:  # this provider is unhealthy - try the next
                print(f"    {p['name']} batch failed: {exc}")
                break
        else:
            print(f"    {p['name']} rate-limited out")
        # Reaching here means this provider gave up - prefer the next one for
        # subsequent batches too, not just this one.
        _preferred_provider = (_preferred_provider + offset + 1) % len(PROVIDERS)
    print("    all LLM providers failed for this batch")
    return [None] * len(items)


def classify_videos(videos: list[dict], fallbacks: list[str]) -> list[dict]:
    """Per-video {"category","language","topics","topics_fresh"}.

    Category: regex rules first (they win), LLM for the misses, then
    `fallbacks[i]` for anything still unclassified. Topics: EVERY video goes
    through the LLM (topic "aboutness" is a judgment call the rules can't
    make), and the result is unioned with the high-precision TOPIC_RULES.
    `topics_fresh` is False when no LLM verdict arrived for that video -
    enrich() uses it to keep a row's existing tags instead of wiping them
    on a provider outage."""
    results = [
        {
            "category": classify_with_rules(v["title"], v.get("description") or ""),
            "language": None,
            "topics": topics_from_rules(v["title"], v.get("description") or ""),
            "topics_fresh": False,
        }
        for v in videos
    ]

    for start in range(0, len(videos), LLM_BATCH):
        chunk = videos[start:start + LLM_BATCH]
        for j, tag in enumerate(classify_batch_with_llm(chunk)):
            if not tag:
                continue
            r = results[start + j]
            if not r["category"]:
                r["category"] = tag["category"]
            r["language"] = tag["language"]
            r["topics"] |= set(tag["topics"])
            r["topics_fresh"] = True
        # Proactive pacing, on top of classify_batch_with_llm's reactive 429
        # backoff: a sustained multi-thousand-video pass (e.g. --enrich over
        # the whole catalog) hit the free tier's rate limit constantly at
        # 0.5s between batches. 2s keeps well clear of it without making a
        # long run agonizingly slow.
        time.sleep(2.0)

    for i, r in enumerate(results):
        if not r["category"]:
            r["category"] = fallbacks[i]
        r["topics"] = sorted(r["topics"])
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
                .select("id, youtube_video_id, title, description, category, language, tags")
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
            # Fresh LLM verdict -> recompute tags outright (lets a wrong old
            # tag disappear). No verdict (outage / --no-llm) -> keep whatever
            # the row already had, plus any rule matches - never wipe tags
            # just because a free tier was down.
            if tag["topics_fresh"]:
                new_tags = tag["topics"]
            else:
                new_tags = sorted(set(tag["topics"]) | set(r.get("tags") or []))
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
                "tags": new_tags,
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
                "tags": tag["topics"],
            })

        db.table("videos").upsert(rows, on_conflict="youtube_video_id").execute()
        total_new += len(rows)

    print(f"Done. {total_new} new video(s) synced.")


if __name__ == "__main__":
    main()
