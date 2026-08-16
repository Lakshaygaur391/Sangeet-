"""
Sangeet Music Scraper (scrap.py)
Fully automated scraper for pagalnew.com across ALL categories up to their LAST page.
Features:
  - Page-by-page streaming & real-time saving to MongoDB & songs.json
  - Multi-threaded concurrent worker pool for high-speed extraction
  - Strict deduplication (by audio_url and normalized title::artist)
  - Auto-detection of last pagination page for every category
  - Resume-friendly (never re-scrapes or re-inserts existing songs)
"""

import sys
import os
import re
import json
import argparse
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup

# Ensure unbuffered console output on Windows
sys.stdout.reconfigure(line_buffering=True)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_URL = "https://pagalnew.com"
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(PROJECT_DIR, "backend", ".env")
SONGS_JSON_PATH = os.path.join(PROJECT_DIR, "backend", "data", "songs.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://pagalnew.com/",
}

# Reusable HTTP session with connection pooling
session = requests.Session()
session.headers.update(HEADERS)
adapter = requests.adapters.HTTPAdapter(pool_connections=50, pool_maxsize=50, max_retries=2)
session.mount("https://", adapter)
session.mount("http://", adapter)

# Category URLs and pagination slugs on pagalnew.com
CATEGORY_MAP = {
    "bollywood": {
        "url": f"{BASE_URL}/category/bollywood-tracks",
        "page_slug": "bollywood-mp3-songs",
        "lang": "Bollywood"
    },
    "indipop": {
        "url": f"{BASE_URL}/category/indipop-mp3-tracks",
        "page_slug": "indipop-mp3-tracks",
        "lang": "Indipop"
    },
    "punjabi": {
        "url": f"{BASE_URL}/category/punjabi-mp3-tracks",
        "page_slug": "punjabi-mp3-tracks",
        "lang": "Punjabi"
    },
    "haryanvi": {
        "url": f"{BASE_URL}/category/haryanvi-mp3-tracks",
        "page_slug": "haryanvi-mp3-tracks",
        "lang": "Haryanvi"
    },
    "bhojpuri": {
        "url": f"{BASE_URL}/category/bhojpuri-mp3-tracks",
        "page_slug": "bhojpuri-mp3-tracks",
        "lang": "Bhojpuri"
    },
}


def load_mongo_uri():
    """Extract MONGO_URI from backend/.env."""
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("MONGO_URI=") or line.startswith("Mongo_URI="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("MONGO_URI") or os.environ.get("Mongo_URI")


def get_mongo_collection():
    """Connect to MongoDB and return the songs collection."""
    try:
        from pymongo import MongoClient
        uri = load_mongo_uri()
        if not uri:
            print("⚠️ No MONGO_URI found in backend/.env. Database direct sync disabled.")
            return None
        client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        # Handle connection strings with or without explicit database name
        try:
            db = client.get_default_database()
        except Exception:
            db = client["test"]
        if db is None or db.name == "admin":
            db = client["test"]
        collection = db["songs"]
        # Verify connection
        collection.estimated_document_count()
        print(f"  [DB Connected] Connected to MongoDB database '{db.name}', collection 'songs'.")
        return collection
    except Exception as e:
        print(f"⚠️ MongoDB connection notice: {e}")
        return None


def sanitize_text(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def normalize_title_key(title, artist):
    t = re.sub(r"[^a-z0-9]", "", (title or "").lower())
    a = re.sub(r"[^a-z0-9]", "", re.split(r"[,&]", (artist or "").lower())[0])
    return f"{t}::{a}" if t else ""


def normalize_audio_key(audio_url):
    return (audio_url or "").strip().lower()


def encode_audio_url(raw_url):
    """Ensure spaces and special chars in audio URLs are safely percent-encoded."""
    if not raw_url:
        return ""
    parsed = urllib.parse.urlsplit(raw_url)
    encoded_path = urllib.parse.quote(parsed.path, safe="/:[]()@-_.~+=%&")
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, encoded_path, parsed.query, parsed.fragment))


def get_last_page_number(soup, default_max=1):
    """Detect max page number from pagination links."""
    max_page = default_max
    for a in soup.find_all("a", href=True):
        href = a["href"]
        m = re.search(r"/category/[^/]+/(\d+)", href)
        if not m:
            m = re.search(r"/(\d+)\s*$", href)
        if m:
            try:
                n = int(m.group(1))
                if n > max_page:
                    max_page = n
            except ValueError:
                pass
    return max_page


def title_case_slug(slug):
    """Convert a hyphen-separated slug to Title Case."""
    return " ".join(w.capitalize() for w in slug.replace("-", " ").replace("_", " ").split() if w)


def extract_year_from_audio_id(audio_url):
    """Estimate release year from the sequential download ID on pagalnew.com."""
    m = re.search(r"/(?:320-download|128-downloads)/(\d+)", audio_url or "")
    if m:
        num_id = int(m.group(1))
        if num_id >= 54000: return "2026"
        elif num_id >= 50000: return "2025"
        elif num_id >= 40000: return "2024"
        elif num_id >= 30000: return "2023"
        elif num_id >= 20000: return "2022"
        elif num_id >= 10000: return "2010s"
        else: return "Retro"
    return "2026"


def extract_album_from_thumb_slug(thumbnail_url, song_title):
    """Extract album/movie name from the cover image slug."""
    if not thumbnail_url:
        return ""
    m = re.search(r"/coverimages/(?:album/)?([^/]+?)(?:-500-500)?(?:\.jpg|\.png|\.webp)$", thumbnail_url, re.I)
    if not m:
        return ""
    slug = m.group(1)
    # Remove trailing dimensions token just in case
    slug = re.sub(r"-\d+-\d+$", "", slug)
    # Remove trailing year token
    slug = re.sub(r"-(20[0-2]\d|19\d{2})$", "", slug)

    tokens = slug.split("-")
    title_tokens = re.sub(r"[^a-z0-9 ]", " ", (song_title or "").lower()).split()

    # Try to match song title tokens from the front of the slug,
    # whatever is left at the end is the album name.
    t_idx = 0
    remainder = []
    for token in tokens:
        if t_idx < len(title_tokens) and token.lower() == title_tokens[t_idx]:
            t_idx += 1
        else:
            remainder.append(token)

    if 0 < len(remainder) <= 6:
        album = title_case_slug("-".join(remainder))
        # Reject obviously bad names
        if album.lower() not in ("mp3", "song", "songs", "download", "audio", "track"):
            return album
    return ""


def extract_song_details(song_page_url, default_language="Hindi"):
    """Fetch and parse a song detail page to extract playable stream URL and metadata."""
    if not song_page_url.startswith("http://") and not song_page_url.startswith("https://"):
        return None

    try:
        res = session.get(song_page_url, timeout=12, allow_redirects=True)
        if res.status_code != 200:
            return None

        soup = BeautifulSoup(res.text, "html.parser")

        # 1. Song Title
        title = ""
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
            title = re.sub(r"(?i)\s+Song\s*-\s*.+$", "", title)
            title = re.sub(r"(?i)\s*(?:Song\s*Download|Mp3\s*Download|Song|Mp3)\s*$", "", title)
            title = sanitize_text(title)

        if not title:
            title_tag = soup.find("title")
            if title_tag:
                title = title_tag.get_text(strip=True).split("-")[0].strip()

        # 2. Singer(s) / Artist(s)
        artist = ""
        singer_tag = soup.find("b", string=re.compile(r"Singer\(s\)|Singers?", re.I))
        if singer_tag:
            raw = singer_tag.next_sibling
            if raw:
                artist = sanitize_text(str(raw))

        if not artist:
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc:
                m = re.search(r"(?:Sung by|Singer[s]?\s*:)\s*([^,.]+)", meta_desc.get("content", ""), re.I)
                if m:
                    artist = sanitize_text(m.group(1))

        if not artist:
            artist = "Various Artists"

        # 3. Language from breadcrumb
        language = default_language
        breadcrumb = soup.find("ul", class_="breadcrumb")
        if breadcrumb:
            for a in breadcrumb.find_all("a", href=True):
                if "/category/" in a["href"]:
                    raw_lang = a.get_text(strip=True)
                    raw_lang = re.sub(r"(?i)\s*(Mp3|Songs?|Music|Tracks?)\s*.*$", "", raw_lang).strip()
                    if raw_lang:
                        language = raw_lang.capitalize()
                        break

        # 4. Thumbnail (high-res 500x500 cover image)
        thumbnail_url = ""
        for img in soup.find_all("img"):
            src = (img.get("data-src") or img.get("src") or "").strip()
            if "coverimages" in src and "500-500" in src:
                thumbnail_url = urllib.parse.urljoin(BASE_URL, src)
                break

        if not thumbnail_url:
            for img in soup.find_all("img"):
                src = (img.get("data-src") or img.get("src") or "").strip()
                if "coverimages" in src and src.endswith((".jpg", ".png", ".webp")):
                    thumbnail_url = urllib.parse.urljoin(BASE_URL, src)
                    break

        # 5. Playable Audio URL (Prefer 320 download link)
        audio_url = ""
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"].strip()
            if "/320-download/" in href:
                audio_url = urllib.parse.urljoin(BASE_URL, href)
                break

        if not audio_url:
            audio_el = soup.find("audio", src=True)
            if audio_el:
                audio_url = urllib.parse.urljoin(BASE_URL, audio_el["src"].strip())

        if not audio_url:
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"].strip()
                if "/128-downloads/" in href:
                    audio_url = urllib.parse.urljoin(BASE_URL, href)
                    break

        if not audio_url or not title:
            return None

        safe_audio_url = encode_audio_url(audio_url)

        # 6. Album / Movie Name  -----------------------------------------
        album = ""
        # Layer A: explicit bold label on page  e.g.  <b>Album:</b> Welcome to the Jungle
        for label in ["Album", "Movie", "Film"]:
            b_tag = soup.find("b", string=re.compile(rf"^{label}\s*:", re.I))
            if b_tag:
                sib = b_tag.next_sibling
                if sib:
                    raw = sanitize_text(str(sib))
                    raw = re.sub(r"^[:\s]+", "", raw).strip()
                    if raw and len(raw) < 80:
                        album = raw
                        break

        # Layer B: meta description  "...from <Album> (2025)..."
        if not album:
            meta_tag = soup.find("meta", attrs={"name": "description"})
            if meta_tag:
                content = meta_tag.get("content", "")
                m2 = re.search(r"(?:from|album|movie|film)[:\s]+([\w\s,'&-]{2,50}?)\s*(?:\(\d{4}\)|mp3|song|$)", content, re.I)
                if m2:
                    album = sanitize_text(m2.group(1))

        # Layer C: thumbnail slug remainder
        if not album:
            album = extract_album_from_thumb_slug(thumbnail_url, title)

        # Clean up
        album = re.sub(r"\s*(?:Mp3\s*Songs?|Songs?|Mp3|Download|Audio)\s*$", "", album, flags=re.I).strip()
        album = re.sub(r"\s*\(\d{4}\)\s*$", "", album).strip()
        if not album or len(album) < 2:
            album = "Single"

        # 7. Year  -----------------------------------------------------------
        year = ""
        # Layer A: explicit bold label  e.g.  <b>Year:</b> 2026
        year_tag = soup.find("b", string=re.compile(r"^Year\s*:", re.I))
        if year_tag:
            sib = year_tag.next_sibling
            if sib:
                m3 = re.search(r"(20[0-2]\d|19\d{2})", str(sib))
                if m3:
                    year = m3.group(1)

        # Layer B: heading or page text
        if not year:
            page_text = soup.get_text()
            m4 = re.search(r"\b(20[0-2]\d|19[5-9]\d)\b", page_text)
            if m4:
                year = m4.group(1)

        # Layer C: thumbnail URL
        if not year:
            m5 = re.search(r"\b(20[0-2]\d|19\d{2})\b", thumbnail_url)
            if m5:
                year = m5.group(1)

        # Layer D: sequential ID estimate
        if not year:
            year = extract_year_from_audio_id(safe_audio_url)

        return {
            "title": title,
            "artist": artist,
            "album": album,
            "year": year,
            "language": language,
            "audio_url": safe_audio_url,
            "thumbnail_url": thumbnail_url or "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
            "youtube_url": "",
        }

    except Exception:
        return None


def get_songs_from_album_page(album_url):
    """Fetch an album page and collect all song URLs (/songs/*.html)."""
    song_links = []
    try:
        res = session.get(album_url, timeout=12)
        if res.status_code != 200:
            return song_links

        soup = BeautifulSoup(res.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            full_url = urllib.parse.urljoin(BASE_URL, href)
            if "/songs/" in full_url and full_url.endswith(".html"):
                if full_url not in song_links:
                    song_links.append(full_url)
    except Exception:
        pass
    return song_links


def get_category_page_items(page_url):
    """Extract album and direct song links from a specific category page."""
    album_links = []
    direct_song_links = []
    detected_max_page = 1

    try:
        res = session.get(page_url, timeout=12)
        if res.status_code != 200:
            return album_links, direct_song_links, detected_max_page

        soup = BeautifulSoup(res.text, "html.parser")
        detected_max_page = get_last_page_number(soup, default_max=1)

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            full_url = urllib.parse.urljoin(BASE_URL, href)

            if "/album/" in full_url and full_url.endswith(".html"):
                if full_url not in album_links:
                    album_links.append(full_url)
            elif "/songs/" in full_url and full_url.endswith(".html"):
                if full_url not in direct_song_links:
                    direct_song_links.append(full_url)

    except Exception as e:
        print(f"  [!] Error fetching category page {page_url}: {e}")

    return album_links, direct_song_links, detected_max_page


class SongCatalogManager:
    """Manages deduplication and real-time persistence to MongoDB & songs.json."""

    def __init__(self, output_path=SONGS_JSON_PATH):
        self.output_path = output_path
        self.seen_audio = set()
        self.seen_title = set()
        self.seen_page_urls = set()
        self.catalog = []
        self.db_collection = get_mongo_collection()
        self.load_existing()

    def load_existing(self):
        # 1. Load from MongoDB if available
        if self.db_collection is not None:
            try:
                for doc in self.db_collection.find({}, {"audio_url": 1, "title": 1, "artist": 1, "_id": 0}):
                    a_key = normalize_audio_key(doc.get("audio_url"))
                    t_key = normalize_title_key(doc.get("title"), doc.get("artist"))
                    if a_key:
                        self.seen_audio.add(a_key)
                    if t_key:
                        self.seen_title.add(t_key)
                print(f"  [DB] Loaded {len(self.seen_audio)} existing unique songs from MongoDB.")
            except Exception as e:
                print(f"  [DB] Notice: {e}")

        # 2. Load from songs.json
        if os.path.exists(self.output_path):
            try:
                with open(self.output_path, "r", encoding="utf-8") as f:
                    self.catalog = json.load(f)
                for s in self.catalog:
                    a_key = normalize_audio_key(s.get("audio_url"))
                    t_key = normalize_title_key(s.get("title"), s.get("artist"))
                    if a_key:
                        self.seen_audio.add(a_key)
                    if t_key:
                        self.seen_title.add(t_key)
                print(f"  [JSON] Loaded {len(self.catalog)} songs from {self.output_path}.")
            except Exception:
                self.catalog = []

    def is_duplicate(self, song):
        a_key = normalize_audio_key(song.get("audio_url"))
        t_key = normalize_title_key(song.get("title"), song.get("artist"))
        if not a_key or not t_key:
            return True
        if a_key in self.seen_audio or t_key in self.seen_title:
            return True
        return False

    def add_songs(self, new_songs):
        """Deduplicate, assign IDs, and save batch to both MongoDB and songs.json."""
        if not new_songs:
            return 0

        unique_batch = []
        for s in new_songs:
            if not self.is_duplicate(s):
                a_key = normalize_audio_key(s.get("audio_url"))
                t_key = normalize_title_key(s.get("title"), s.get("artist"))
                self.seen_audio.add(a_key)
                self.seen_title.add(t_key)
                s["id"] = len(self.catalog) + len(unique_batch) + 1
                unique_batch.append(s)

        if not unique_batch:
            return 0

        # Save to MongoDB
        if self.db_collection is not None:
            try:
                from pymongo import UpdateOne
                ops = [
                    UpdateOne(
                        {"audio_url": song["audio_url"]},
                        {"$set": {
                            "title": song["title"],
                            "artist": song["artist"],
                            "language": song["language"],
                            "audio_url": song["audio_url"],
                            "thumbnail_url": song["thumbnail_url"],
                            "youtube_url": "",
                        }},
                        upsert=True
                    )
                    for song in unique_batch
                ]
                self.db_collection.bulk_write(ops, ordered=False)
            except Exception as e:
                print(f"  [DB Save Notice] {e}")

        # Append to JSON
        self.catalog.extend(unique_batch)
        os.makedirs(os.path.dirname(os.path.abspath(self.output_path)), exist_ok=True)
        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(self.catalog, f, indent=2, ensure_ascii=False)

        return len(unique_batch)


def scrape_category_all_pages(cat_key, manager, workers=16, max_pages=None):
    """
    Scrape an entire category from page 1 to the detected LAST page.
    Saves and deduplicates songs after EVERY page so progress is never lost.
    """
    cat_info = CATEGORY_MAP.get(cat_key, {
        "url": f"{BASE_URL}/category/{cat_key}",
        "page_slug": cat_key,
        "lang": cat_key.capitalize(),
    })
    lang_label = cat_info["lang"]
    base_url = cat_info["url"]
    page_slug = cat_info["page_slug"]

    print(f"\n{'='*65}")
    print(f"[*] Starting {lang_label.upper()} Category Scraping (All Available Pages)")
    print(f"    Base URL: {base_url}")
    print(f"{'='*65}")

    # Probe page 1
    albums, direct_songs, detected_last = get_category_page_items(base_url)
    total_pages = max_pages if (max_pages and max_pages > 0) else detected_last
    print(f"    --> Total pages detected for {lang_label}: {detected_last} pages. (Crawling up to page {total_pages})")

    total_added_category = 0
    empty_consecutive_pages = 0

    for page_num in range(1, total_pages + 1):
        if page_num == 1:
            curr_url = base_url
            curr_albums, curr_direct = albums, direct_songs
        else:
            curr_url = f"{BASE_URL}/category/{page_slug}/{page_num}"
            curr_albums, curr_direct, new_detected = get_category_page_items(curr_url)
            if new_detected > total_pages and (not max_pages or max_pages <= 0):
                total_pages = new_detected

        # Stop if no items found
        if not curr_albums and not curr_direct:
            empty_consecutive_pages += 1
            if empty_consecutive_pages >= 3:
                print(f"    [!] No items on page {page_num} (consecutive empty pages). Finished {lang_label}.")
                break
            continue
        else:
            empty_consecutive_pages = 0

        # Collect song URLs from direct songs + album cards on this page
        page_song_urls = []
        for s_url in curr_direct:
            if s_url not in manager.seen_page_urls:
                manager.seen_page_urls.add(s_url)
                page_song_urls.append(s_url)

        # Resolve albums in parallel
        if curr_albums:
            with ThreadPoolExecutor(max_workers=min(workers, len(curr_albums))) as alb_exec:
                alb_futures = {alb_exec.submit(get_songs_from_album_page, a): a for a in curr_albums}
                for f in as_completed(alb_futures):
                    for s_url in f.result():
                        if s_url not in manager.seen_page_urls:
                            manager.seen_page_urls.add(s_url)
                            page_song_urls.append(s_url)

        if not page_song_urls:
            continue

        # Fetch song details in parallel
        scraped_songs = []
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {
                executor.submit(extract_song_details, url, lang_label): url
                for url in page_song_urls
            }
            for future in as_completed(future_map):
                try:
                    song = future.result()
                    if song and song.get("audio_url"):
                        scraped_songs.append(song)
                except Exception:
                    pass

        # Save & deduplicate immediately
        added = manager.add_songs(scraped_songs)
        total_added_category += added
        print(f"  [{lang_label} Page {page_num:>3}/{total_pages}] Found {len(page_song_urls):>2} songs | +{added} new saved (Total in Catalog: {len(manager.catalog)})")

    print(f"\n[✓] Finished {lang_label}: Added {total_added_category} new unique songs.")
    return total_added_category


def main():
    parser = argparse.ArgumentParser(
        description="Scrape ALL songs from pagalnew.com across ALL pages with real-time deduplication",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--category", type=str, default=None,
        help="Category to scrape (bollywood, indipop, punjabi, haryanvi, bhojpuri). If omitted, scrapes ALL categories."
    )
    parser.add_argument(
        "--max-pages", type=int, default=None,
        help="Limit number of pages per category (default: None = crawl up to the very last page)"
    )
    parser.add_argument(
        "--workers", type=int, default=16,
        help="Concurrent worker threads (default: 16)"
    )
    parser.add_argument(
        "--output", type=str, default=SONGS_JSON_PATH,
        help=f"Output JSON file path (default: {SONGS_JSON_PATH})"
    )

    args = parser.parse_args()

    print("\n" + "=" * 65)
    print("      SANGEET MUSIC SCRAPER — FULL CATALOG CRAWLER")
    print("=" * 65)

    manager = SongCatalogManager(output_path=args.output)

    categories_to_scrape = [args.category.lower().strip()] if args.category else list(CATEGORY_MAP.keys())

    grand_total_added = 0
    for cat in categories_to_scrape:
        added = scrape_category_all_pages(cat, manager, workers=args.workers, max_pages=args.max_pages)
        grand_total_added += added

    print("\n" + "=" * 65)
    print("                 SCRAPING COMPLETED")
    print("=" * 65)
    print(f"  - Total New Songs Added  : {grand_total_added}")
    print(f"  - Total Unique Catalog   : {len(manager.catalog)}")
    if manager.db_collection is not None:
        print(f"  - Total in MongoDB       : {manager.db_collection.count_documents({})}")
    print(f"  - JSON Catalog File      : {args.output}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
