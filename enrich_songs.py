"""
enrich_songs.py
===============
One-shot script that enriches ALL existing songs in MongoDB + songs.json
with proper `album` and `year` fields, using the same multi-layer detection
logic as the scraper (no re-crawling needed).
"""

import os, re, json, sys
from pathlib import Path

PROJECT_DIR = Path(__file__).parent
ENV_PATH = PROJECT_DIR / "backend" / ".env"
SONGS_JSON = PROJECT_DIR / "backend" / "data" / "songs.json"


# ── helpers ──────────────────────────────────────────────────────────────────

def load_mongo_uri():
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith(("MONGO_URI=", "Mongo_URI=")):
                return line.split("=", 1)[1].strip().strip("'\"")
    return os.environ.get("MONGO_URI") or os.environ.get("Mongo_URI")


def title_case_slug(slug: str) -> str:
    return " ".join(w.capitalize() for w in re.split(r"[-_ ]+", slug) if w)


def extract_year_from_audio_id(audio_url: str) -> str:
    m = re.search(r"/(?:320-download|128-downloads)/(\d+)", audio_url or "")
    if m:
        n = int(m.group(1))
        if n >= 54000: return "2026"
        if n >= 50000: return "2025"
        if n >= 40000: return "2024"
        if n >= 30000: return "2023"
        if n >= 20000: return "2022"
        if n >= 10000: return "2010s"
        return "Retro"
    return "2026"


def extract_album_from_thumb(thumbnail_url: str, song_title: str) -> str:
    if not thumbnail_url:
        return ""
    m = re.search(
        r"/coverimages/(?:album/)?([^/]+?)(?:-500-500)?(?:\.jpg|\.png|\.webp)$",
        thumbnail_url, re.I
    )
    if not m:
        return ""
    slug = re.sub(r"-\d+-\d+$", "", m.group(1))
    slug = re.sub(r"-(20[0-2]\d|19\d{2})$", "", slug)

    tokens = slug.split("-")
    title_tokens = re.sub(r"[^a-z0-9 ]", " ", (song_title or "").lower()).split()

    t_idx, remainder = 0, []
    for tok in tokens:
        if t_idx < len(title_tokens) and tok.lower() == title_tokens[t_idx]:
            t_idx += 1
        else:
            remainder.append(tok)

    if 0 < len(remainder) <= 6:
        album = title_case_slug("-".join(remainder))
        if album.lower() not in ("mp3", "song", "songs", "download", "audio", "track"):
            return album
    return ""


def enrich(song: dict) -> dict:
    """Return the song dict with album/year filled in (never overwrites existing values)."""
    title = song.get("title", "")
    thumb = song.get("thumbnail_url", "")
    audio = song.get("audio_url", "")

    # ── Year ─────────────────────────────────────────────────────────────────
    year = song.get("year", "").strip()
    if not year:
        # Try thumb URL
        m = re.search(r"\b(20[0-2]\d|19\d{2})\b", thumb)
        if m:
            year = m.group(1)
    if not year:
        # Try title
        m = re.search(r"\b(20[0-2]\d|19\d{2})\b", title)
        if m:
            year = m.group(1)
    if not year:
        year = extract_year_from_audio_id(audio)

    # ── Album ─────────────────────────────────────────────────────────────────
    album = song.get("album", "").strip()
    if not album or album == "Single":
        album = extract_album_from_thumb(thumb, title)
        # Clean
        album = re.sub(r"\s*(?:Mp3\s*Songs?|Songs?|Mp3|Download|Audio)\s*$", "", album, flags=re.I).strip()
        album = re.sub(r"\s*\(\d{4}\)\s*$", "", album).strip()
        if not album or len(album) < 2:
            album = "Single"

    return {**song, "album": album, "year": year}


# ── JSON enrichment ───────────────────────────────────────────────────────────

def enrich_json():
    if not SONGS_JSON.exists():
        print(f"[JSON] {SONGS_JSON} not found — skipping.")
        return

    songs = json.loads(SONGS_JSON.read_text(encoding="utf-8"))
    print(f"[JSON] Enriching {len(songs)} songs ...", flush=True)
    enriched = [enrich(s) for s in songs]
    SONGS_JSON.write_text(json.dumps(enriched, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[JSON] Saved {len(enriched)} enriched songs -> {SONGS_JSON.name}")

    # Quick stats
    years = {}
    albums_set = set()
    for s in enriched:
        years[s["year"]] = years.get(s["year"], 0) + 1
        if s["album"] != "Single":
            albums_set.add(s["album"])
    print(f"[JSON] Year distribution: {dict(sorted(years.items(), reverse=True))}")
    print(f"[JSON] Unique named albums detected: {len(albums_set)}")


# ── MongoDB enrichment ────────────────────────────────────────────────────────

def enrich_mongo():
    uri = load_mongo_uri()
    if not uri:
        print("[DB] No MONGO_URI found — skipping database enrichment.")
        return

    try:
        from pymongo import MongoClient, UpdateOne
    except ImportError:
        print("[DB] pymongo not installed — skipping database enrichment.")
        return

    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    try:
        db = client.get_default_database()
    except Exception:
        db = client["test"]
    col = db["songs"]

    total = col.estimated_document_count()
    print(f"[DB] Processing {total} MongoDB records ...", flush=True)

    BATCH = 500
    cursor = col.find({}, {"_id": 1, "title": 1, "thumbnail_url": 1, "audio_url": 1, "album": 1, "year": 1})

    ops, processed = [], 0
    for doc in cursor:
        enriched = enrich(doc)
        ops.append(UpdateOne(
            {"_id": doc["_id"]},
            {"$set": {"album": enriched["album"], "year": enriched["year"]}}
        ))
        processed += 1
        if len(ops) == BATCH:
            col.bulk_write(ops, ordered=False)
            print(f"[DB] Updated {processed}/{total} | album: '{enriched['album']}', year: '{enriched['year']}'")
            ops = []

    if ops:
        col.bulk_write(ops, ordered=False)
        print(f"  [DB] Updated {processed}/{total}", flush=True)

    # Sample check
    print("\n[DB] Sample enriched records:")
    for i, s in enumerate(col.find().limit(8), 1):
        print(f"  {i}. [{s.get('year','?')}] {s['title'][:40]} | Album: \"{s.get('album','?')}\"")

    print(f"\n[DB] Enrichment complete -- {processed} records updated.")
    client.close()


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("[START] Album & Year Enrichment\n")
    enrich_json()
    print()
    enrich_mongo()
    print("\n[DONE] All done!")
