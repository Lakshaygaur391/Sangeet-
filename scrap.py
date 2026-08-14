"""
Sangeet Music Scraper (scrap.py)
Scrapes songs, direct MP3 audio stream links, high-res album thumbnails,
artists, and language metadata from PagalWorld, and exports to songs.json or MongoDB.
"""

import sys
import os
import re
import json
import argparse
import urllib.parse
import requests
from bs4 import BeautifulSoup

# Ensure safe console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_URL = "https://pagalworld.is"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

CATEGORY_MAP = {
    "bollywood": f"{BASE_URL}/category/bollywood-songs/",
    "punjabi": f"{BASE_URL}/category/punjabi-songs/",
    "haryanvi": f"{BASE_URL}/category/haryanvi-songs/",
    "indipop": f"{BASE_URL}/category/indipop-songs/",
    "bhojpuri": f"{BASE_URL}/category/bhojpuri-songs/",
}


def sanitize_text(text):
    if not text:
        return ""
    text = re.sub(r"\s+", " ", str(text))
    return text.strip()


def encode_audio_url(raw_url):
    """Ensure spaces and special characters in MP3 URLs are safely percent-encoded for browsers/audio tags."""
    if not raw_url:
        return ""
    parsed = urllib.parse.urlsplit(raw_url)
    encoded_path = urllib.parse.quote(parsed.path, safe="/:[]()@-_.~+=")
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, encoded_path, parsed.query, parsed.fragment))


def extract_song_details(song_page_url, default_language="Hindi"):
    """Fetch and parse a song detail page to extract title, singer, audio_url, thumbnail_url, and language."""
    try:
        res = requests.get(song_page_url, headers=HEADERS, timeout=12)
        if res.status_code != 200:
            return None

        soup = BeautifulSoup(res.text, "html.parser")

        # 1. Extract Song Title
        title = ""
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
            title = re.sub(r"(?i)\s*(?:song\s*download|mp3\s*download|song|mp3)\s*$", "", title)
            title = sanitize_text(title)

        if not title:
            title_tag = soup.find("title")
            if title_tag:
                title = title_tag.get_text(strip=True).split("-")[0].strip()

        # 2. Extract Singer(s) / Artist(s)
        artist = ""
        singer_cell = soup.find(string=re.compile(r"Singer\(s\)|Artist\(s\)", re.I))
        if singer_cell:
            parent = singer_cell.find_parent(["tr", "div", "p", "li"])
            if parent:
                raw_text = parent.get_text(strip=True)
                artist = re.sub(r"(?i)^(?:Singer\(s\)|Artist\(s\))[:\s]*", "", raw_text).strip()

        if not artist:
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and "sung by" in meta_desc.get("content", ""):
                m = re.search(r"sung by\s+([^.\n]+)", meta_desc.get("content", ""), re.I)
                if m:
                    artist = m.group(1).split("and")[0].strip()

        if not artist:
            artist = "Various Artists"

        # 3. Extract Language / Category
        language = default_language
        for cat_name, cat_url in CATEGORY_MAP.items():
            if cat_name in song_page_url.lower() or cat_name in res.text.lower()[:2000]:
                language = cat_name.capitalize()
                break

        # 4. Extract High-Res Thumbnail Image (500x500 poster)
        thumbnail_url = ""
        for img in soup.find_all("img"):
            src = img.get("data-src") or img.get("data-original") or img.get("data-lazy-src") or img.get("src") or ""
            if "500x500" in src and "uploads" in src:
                thumbnail_url = urllib.parse.urljoin(BASE_URL, src)
                break
            elif "uploads" in src and ("wp-content" in src) and not thumbnail_url:
                thumbnail_url = urllib.parse.urljoin(BASE_URL, src)

        # 5. Extract Direct MP3 Audio Link (prefer 320kbps or 128kbps)
        audio_url = ""
        mp3_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.lower().endswith(".mp3") or ".mp3?" in href.lower() or ("download" in href.lower() and ".mp3" in href.lower()):
                full_href = urllib.parse.urljoin(BASE_URL, href)
                mp3_links.append(full_href)

        # Pick 320kbps if available, else first mp3 link
        for link in mp3_links:
            if "320 kbps" in link or "320kbps" in link:
                audio_url = link
                break
        if not audio_url and mp3_links:
            audio_url = mp3_links[0]

        if not audio_url or not title:
            return None

        # Clean audio URL encoding for safe HTML5 playback
        safe_audio_url = encode_audio_url(audio_url)

        return {
            "title": title,
            "artist": artist,
            "language": language,
            "audio_url": safe_audio_url,
            "thumbnail_url": thumbnail_url or "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
            "youtube_url": "",
        }

    except Exception as e:
        print(f"  [!] Error scraping {song_page_url}: {e}")
        return None


def get_song_links_from_page(page_url):
    """Scrape all song detail page links from a homepage or category listing."""
    links = []
    try:
        res = requests.get(page_url, headers=HEADERS, timeout=12)
        if res.status_code != 200:
            return links

        soup = BeautifulSoup(res.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if "/song/" in href and "-mp3-download" in href:
                full_url = urllib.parse.urljoin(BASE_URL, href)
                if full_url not in links:
                    links.append(full_url)
    except Exception as e:
        print(f"[!] Error fetching listing from {page_url}: {e}")
    return links


def search_songs(query):
    """Search PagalWorld for a specific song query and return matching detail URLs."""
    search_url = f"{BASE_URL}/?s={urllib.parse.quote(query)}"
    return get_song_links_from_page(search_url)


def scrape_catalog(limit=20, category=None):
    """Scrape a list of songs up to the requested limit."""
    targets = []
    if category and category.lower() in CATEGORY_MAP:
        targets.append((CATEGORY_MAP[category.lower()], category.capitalize()))
    else:
        targets.append((BASE_URL, "Hindi"))
        for cat_name, cat_url in CATEGORY_MAP.items():
            targets.append((cat_url, cat_name.capitalize()))

    scraped_songs = []
    seen_urls = set()

    print(f"[*] Starting scrape (Target limit: {limit} songs)...")

    for listing_url, default_lang in targets:
        if len(scraped_songs) >= limit:
            break

        print(f"\n[+] Fetching song list from: {listing_url}")
        song_links = get_song_links_from_page(listing_url)
        print(f"    Found {len(song_links)} candidate songs on page.")

        for song_url in song_links:
            if len(scraped_songs) >= limit:
                break
            if song_url in seen_urls:
                continue
            seen_urls.add(song_url)

            details = extract_song_details(song_url, default_language=default_lang)
            if details and details.get("audio_url"):
                scraped_songs.append(details)
                print(f"    [OK] [{len(scraped_songs)}/{limit}] {details['title']} - {details['artist']} ({details['language']})")
                print(f"         Audio: {details['audio_url'][:75]}...")

    return scraped_songs


def save_to_json(songs, output_path="backend/data/songs.json"):
    """Merge scraped songs into existing JSON catalog without duplicates."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    existing_songs = []

    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_songs = json.load(f)
        except Exception:
            existing_songs = []

    # Map existing by title::artist key
    merged_map = {}
    for s in existing_songs:
        key = f"{s.get('title', '').strip().lower()}::{s.get('artist', '').strip().lower()}"
        merged_map[key] = s

    new_count = 0
    updated_count = 0

    for s in songs:
        key = f"{s.get('title', '').strip().lower()}::{s.get('artist', '').strip().lower()}"
        if key in merged_map:
            if s.get("audio_url"):
                merged_map[key]["audio_url"] = s["audio_url"]
            if s.get("thumbnail_url") and not merged_map[key].get("thumbnail_url"):
                merged_map[key]["thumbnail_url"] = s["thumbnail_url"]
            updated_count += 1
        else:
            s["id"] = len(merged_map) + 1
            merged_map[key] = s
            new_count += 1

    final_list = list(merged_map.values())
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    print(f"\n[+] Saved to {output_path}!")
    print(f"    Added {new_count} new songs, updated {updated_count} existing songs. Total songs in JSON: {len(final_list)}")


def sync_to_mongodb(songs):
    """Directly insert/update scraped songs in MongoDB if pymongo is installed and .env configured."""
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv

        load_dotenv("backend/.env")
        mongo_uri = os.getenv("MONGO_URI") or os.getenv("Mongo_URI")

        if not mongo_uri:
            print("[!] MONGO_URI not found in backend/.env. Skipping direct DB sync.")
            return

        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        songs_col = db["songs"]

        upserted = 0
        for s in songs:
            res = songs_col.update_one(
                {
                    "title": {"$regex": f"^{re.escape(s['title'])}$", "$options": "i"},
                    "artist": {"$regex": f"^{re.escape(s['artist'])}$", "$options": "i"},
                },
                {"$set": s},
                upsert=True,
            )
            if res.upserted_id or res.modified_count:
                upserted += 1

        print(f"[+] MongoDB sync complete! {upserted} songs upserted into database.")

    except ImportError:
        print("[i] pymongo not installed in Python environment. Run 'node backend/importdata.js' to sync JSON to MongoDB.")
    except Exception as e:
        print(f"[!] MongoDB sync error: {e}")


def main():
    parser = argparse.ArgumentParser(description="Scrape songs with direct MP3 audio links from PagalWorld")
    parser.add_argument("--limit", type=int, default=25, help="Number of songs to scrape (default: 25)")
    parser.add_argument("--category", type=str, default=None, choices=["bollywood", "punjabi", "haryanvi", "indipop", "bhojpuri"], help="Filter by category")
    parser.add_argument("--search", type=str, default=None, help="Search for a specific song name")
    parser.add_argument("--output", type=str, default="backend/data/songs.json", help="Path to output songs.json")
    parser.add_argument("--sync-db", action="store_true", help="Directly sync scraped songs to MongoDB")

    args = parser.parse_args()

    scraped = []
    if args.search:
        print(f"[*] Searching for: '{args.search}'...")
        links = search_songs(args.search)
        print(f"Found {len(links)} results.")
        for link in links[: args.limit]:
            item = extract_song_details(link)
            if item:
                scraped.append(item)
                print(f"    [OK] Found: {item['title']} - {item['artist']}")
                print(f"         Audio: {item['audio_url']}")
    else:
        scraped = scrape_catalog(limit=args.limit, category=args.category)

    if scraped:
        save_to_json(scraped, output_path=args.output)
        if args.sync_db:
            sync_to_mongodb(scraped)
        print("\n[+] Done! You can run 'node backend/importdata.js' to reload songs into MongoDB.")
    else:
        print("[-] No songs were scraped.")


if __name__ == "__main__":
    main()