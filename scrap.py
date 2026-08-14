"""
Sangeet Music Scraper (scrap.py)
Scrapes songs, direct MP3 audio stream links (wp-content/uploads/year/month/file.mp3),
high-res album thumbnails, artists, and language metadata from PagalWorld.
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
    "hindi": f"{BASE_URL}/category/hindi-songs/",
}


def sanitize_text(text):
    if not text:
        return ""
    text = re.sub(r"\s+", " ", str(text))
    return text.strip()


def encode_audio_url(raw_url):
    """Ensure spaces and special chars in MP3 URLs are safely percent-encoded for browsers without breaking entity codes."""
    if not raw_url:
        return ""
    parsed = urllib.parse.urlsplit(raw_url)
    encoded_path = urllib.parse.quote(parsed.path, safe="/:[]()@-_.~+=%&")
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, encoded_path, parsed.query, parsed.fragment))


def extract_song_details(song_page_url, default_language="Hindi"):
    """Fetch and parse a song detail page to extract the real playable 200 OK MP3 stream URL."""
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
        for cat_name in CATEGORY_MAP.keys():
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

        # 5. Extract TRUE Playable MP3 Stream URL directly from data-file, data-year, data-month
        audio_url = ""
        candidates = []
        for el in soup.find_all(attrs={"data-file": True}):
            d_file = el.get("data-file", "").strip()
            d_year = el.get("data-year", "").strip()
            d_month = el.get("data-month", "").strip()
            if d_file:
                # Keep exact raw filename (e.g. including &quot;) because PagalWorld's disk uses exact raw characters
                if d_year and d_month:
                    stream_url = f"https://pagalworld.is/wp-content/uploads/{d_year}/{d_month}/{d_file}"
                else:
                    stream_url = f"https://pagalworld.is/wp-content/uploads/{d_file}"
                candidates.append((stream_url, d_file))

        # Prefer 320kbps
        for url_cand, fname in candidates:
            if "320" in fname:
                audio_url = url_cand
                break
        if not audio_url and candidates:
            audio_url = candidates[0][0]

        # Fallback to direct download href if data-file wasn't found
        if not audio_url:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if "/wp-content/uploads/" in href and href.lower().endswith(".mp3"):
                    audio_url = urllib.parse.urljoin(BASE_URL, href)
                    break

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


def get_paginated_song_links(base_listing_url, max_pages=5, target_count=None):
    """Collect song links across multiple listing pages."""
    all_links = []
    seen = set()

    for page_num in range(1, max_pages + 1):
        if target_count and len(all_links) >= target_count:
            break

        if page_num == 1:
            page_url = base_listing_url
        else:
            page_url = base_listing_url.rstrip("/") + f"/page/{page_num}/"

        links = get_song_links_from_page(page_url)
        if not links:
            break

        new_links = [l for l in links if l not in seen]
        if not new_links:
            break

        for l in new_links:
            seen.add(l)
        all_links.extend(new_links)

    return all_links


def scrape_catalog(limit=50, category=None):
    """Scrape songs with validated stream URLs."""
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

        print(f"\n[+] Fetching from: {listing_url}")
        song_links = get_paginated_song_links(listing_url, max_pages=3, target_count=limit)

        for song_url in song_links:
            if len(scraped_songs) >= limit:
                break
            if song_url in seen_urls:
                continue
            seen_urls.add(song_url)

            details = extract_song_details(song_url, default_language=default_lang)
            if details and details.get("audio_url"):
                scraped_songs.append(details)
                print(f"    [OK] [{len(scraped_songs)}/{limit}] {details['title']} - {details['artist']}")
                print(f"         Stream: {details['audio_url']}")

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

    merged_map = {}
    for s in existing_songs:
        key = f"{s.get('title', '').strip().lower()}::{s.get('artist', '').strip().lower()}"
        merged_map[key] = s

    for s in songs:
        key = f"{s.get('title', '').strip().lower()}::{s.get('artist', '').strip().lower()}"
        if key in merged_map:
            merged_map[key]["audio_url"] = s["audio_url"]
            if s.get("thumbnail_url"):
                merged_map[key]["thumbnail_url"] = s["thumbnail_url"]
        else:
            s["id"] = len(merged_map) + 1
            merged_map[key] = s

    final_list = list(merged_map.values())
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_list, f, indent=2, ensure_ascii=False)

    playable = len([s for s in final_list if s.get("audio_url") and "/wp-content/uploads/" in s.get("audio_url")])
    print(f"\n[+] Saved to {output_path}!")
    print(f"    Total songs in catalog: {len(final_list)}")
    print(f"    Playable stream URLs: {playable}")


def main():
    parser = argparse.ArgumentParser(description="Scrape playable MP3 songs from PagalWorld")
    parser.add_argument("--limit", type=int, default=50, help="Number of songs to scrape")
    parser.add_argument("--category", type=str, default=None, choices=list(CATEGORY_MAP.keys()))
    parser.add_argument("--output", type=str, default="backend/data/songs.json")

    args = parser.parse_args()
    scraped = scrape_catalog(limit=args.limit, category=args.category)

    if scraped:
        save_to_json(scraped, output_path=args.output)
        print("\n[+] Done! Now run 'node backend/importdata.js' to update MongoDB.")
    else:
        print("[-] No songs scraped.")


if __name__ == "__main__":
    main()