"""
Sangeet Music Scraper (scrap.py)
Scrapes multi-language song catalogs (Punjabi, Haryanvi, Bollywood, Indipop, Bhojpuri),
navigates category grids -> album pages -> song pages to extract direct 320kbps MP3 stream URLs,
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

# Verified Category URLs on PagalWorld
CATEGORY_MAP = {
    "haryanvi": f"{BASE_URL}/category/haryanvi/",
    "punjabi": f"{BASE_URL}/category/punjabi/",
    "bollywood": f"{BASE_URL}/category/bollywood/",
    "indipop": f"{BASE_URL}/category/indipop/",
    "bhojpuri": f"{BASE_URL}/category/bhojpuri/",
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
    if not song_page_url.startswith("http://") and not song_page_url.startswith("https://"):
        return None

    try:
        res = requests.get(song_page_url, headers=HEADERS, timeout=12)
        if res.status_code != 200:
            return None

        soup = BeautifulSoup(res.text, "html.parser")
        main_content = soup.find("div", class_="main-content") or soup

        # 1. Extract Song Title
        title = ""
        h1 = main_content.find("h1") or soup.find("h1")
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
        singer_cell = main_content.find(string=re.compile(r"Singer\(s\)|Artist\(s\)|Singer", re.I))
        if singer_cell:
            parent = singer_cell.find_parent(["tr", "div", "p", "li"])
            if parent:
                raw_text = parent.get_text(strip=True)
                artist = re.sub(r"(?i)^(?:Singer\(s\)|Artist\(s\)|Singer)[:\s]*", "", raw_text).strip()

        if not artist:
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and "sung by" in meta_desc.get("content", ""):
                m = re.search(r"sung by\s+([^.\n]+)", meta_desc.get("content", ""), re.I)
                if m:
                    artist = m.group(1).split("and")[0].strip()

        if not artist:
            artist = "Various Artists"

        # 3. Extract exact language from breadcrumb on song detail page
        language = default_language
        breadcrumb = soup.find("ul", class_="breadcrumb")
        if breadcrumb:
            cat_link = breadcrumb.find("a", href=re.compile(r"/category/([^/]+)/"))
            if cat_link:
                raw_lang = cat_link.get_text(strip=True).capitalize()
                if raw_lang:
                    language = raw_lang

        # 4. Extract High-Res Thumbnail Image (500x500 poster)
        thumbnail_url = ""
        for img in main_content.find_all("img"):
            src = img.get("data-src") or img.get("data-original") or img.get("data-lazy-src") or img.get("src") or ""
            if "500x500" in src and "uploads" in src:
                thumbnail_url = urllib.parse.urljoin(BASE_URL, src)
                break
            elif "uploads" in src and ("wp-content" in src) and not thumbnail_url:
                thumbnail_url = urllib.parse.urljoin(BASE_URL, src)

        if not thumbnail_url:
            for img in soup.find_all("img"):
                src = img.get("data-src") or img.get("src") or ""
                if "uploads" in src and "500x500" in src:
                    thumbnail_url = urllib.parse.urljoin(BASE_URL, src)
                    break

        # 5. Extract TRUE Playable MP3 Stream URL directly from data-file, data-year, data-month
        audio_url = ""
        candidates = []
        for el in main_content.find_all(attrs={"data-file": True}):
            d_file = el.get("data-file", "").strip()
            d_year = el.get("data-year", "").strip()
            d_month = el.get("data-month", "").strip()
            if d_file:
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
            for a in main_content.find_all("a", href=True):
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


def get_songs_from_album_page(album_url):
    """Open an album page (e.g. /album/main-vohe/) and extract all its song download URLs from main-content."""
    song_links = []
    try:
        res = requests.get(album_url, headers=HEADERS, timeout=12)
        if res.status_code != 200:
            return song_links

        soup = BeautifulSoup(res.text, "html.parser")
        main_content = soup.find("div", class_="main-content") or soup

        for a in main_content.find_all("a", href=True):
            href = a["href"].strip()
            if not href.startswith("http://") and not href.startswith("https://") and not href.startswith("/"):
                continue
            if "/song/" in href and "-mp3-download" in href:
                full_url = urllib.parse.urljoin(BASE_URL, href)
                if full_url not in song_links:
                    song_links.append(full_url)
    except Exception as e:
        print(f"  [!] Error reading album {album_url}: {e}")
    return song_links


def get_category_items(category_page_url):
    """Extract album cards and song cards ONLY from the main category grid (ignoring sidebars)."""
    album_links = []
    direct_song_links = []
    try:
        res = requests.get(category_page_url, headers=HEADERS, timeout=12)
        if res.status_code != 200:
            return album_links, direct_song_links

        soup = BeautifulSoup(res.text, "html.parser")
        main_content = soup.find("div", class_="main-content") or soup
        song_list = main_content.find("ul", class_="song-list") or main_content

        for a in song_list.find_all("a", href=True):
            href = a["href"].strip()
            if not href.startswith("http://") and not href.startswith("https://") and not href.startswith("/"):
                continue
            if "/album/" in href and not href.endswith("/album/"):
                full_url = urllib.parse.urljoin(BASE_URL, href)
                if full_url not in album_links:
                    album_links.append(full_url)
            elif "/song/" in href and "-mp3-download" in href:
                full_url = urllib.parse.urljoin(BASE_URL, href)
                if full_url not in direct_song_links:
                    direct_song_links.append(full_url)
    except Exception as e:
        print(f"[!] Error fetching category listing from {category_page_url}: {e}")

    return album_links, direct_song_links


def get_all_category_song_links(category_base_url, max_pages=3, target_count=30):
    """Collect all song links across paginated category listings, resolving album pages to songs."""
    final_song_links = []
    seen_songs = set()
    seen_albums = set()

    for page_num in range(1, max_pages + 1):
        if len(final_song_links) >= target_count:
            break

        if page_num == 1:
            page_url = category_base_url
        else:
            page_url = category_base_url.rstrip("/") + f"/page/{page_num}/"

        print(f"  --> Browsing category page {page_num}: {page_url}")
        albums, direct_songs = get_category_items(page_url)
        print(f"      Found {len(albums)} album cards, {len(direct_songs)} direct songs in grid.")

        # Add direct song links from category grid
        for s_url in direct_songs:
            if s_url not in seen_songs and len(final_song_links) < target_count:
                seen_songs.add(s_url)
                final_song_links.append(s_url)

        # Resolve album cards to individual songs
        for a_url in albums:
            if len(final_song_links) >= target_count:
                break
            if a_url in seen_albums:
                continue
            seen_albums.add(a_url)

            album_songs = get_songs_from_album_page(a_url)
            for s_url in album_songs:
                if s_url not in seen_songs and len(final_song_links) < target_count:
                    seen_songs.add(s_url)
                    final_song_links.append(s_url)

        if not albums and not direct_songs:
            break

    return final_song_links


def scrape_category(category_name, per_category_limit=20):
    """Scrape songs from a specific category."""
    cat_key = category_name.lower().strip()
    if cat_key not in CATEGORY_MAP:
        print(f"[!] Unknown category '{category_name}'. Available: {list(CATEGORY_MAP.keys())}")
        return []

    url = CATEGORY_MAP[cat_key]
    lang_label = cat_key.capitalize()

    print(f"\n=======================================================")
    print(f"[+] Scraping {lang_label} catalog from: {url}")
    print(f"=======================================================")

    song_links = get_all_category_song_links(url, max_pages=3, target_count=per_category_limit)
    print(f"    Resolved {len(song_links)} song URLs from {lang_label} album cards.")

    scraped = []
    for link in song_links:
        if len(scraped) >= per_category_limit:
            break
        details = extract_song_details(link, default_language=lang_label)
        if details and details.get("audio_url"):
            scraped.append(details)
            print(f"    [OK] [{len(scraped)}/{per_category_limit}] {details['title']} - {details['artist']} ({lang_label})")
            print(f"         Stream: {details['audio_url']}")

    return scraped


def scrape_all_categories(per_category_limit=15):
    """Scrape songs across all categories."""
    all_scraped = []
    for cat_name in CATEGORY_MAP.keys():
        songs = scrape_category(cat_name, per_category_limit=per_category_limit)
        all_scraped.extend(songs)
    return all_scraped


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
            if s.get("language"):
                merged_map[key]["language"] = s["language"]
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
    parser = argparse.ArgumentParser(description="Scrape playable MP3 songs from PagalWorld category & album trees")
    parser.add_argument("--category", type=str, default=None, choices=list(CATEGORY_MAP.keys()), help="Single category to scrape (e.g. haryanvi, punjabi)")
    parser.add_argument("--per-category", type=int, default=15, help="Number of songs per category (default: 15)")
    parser.add_argument("--all", action="store_true", help="Scrape all categories")
    parser.add_argument("--output", type=str, default="backend/data/songs.json")

    args = parser.parse_args()

    if args.category:
        scraped = scrape_category(args.category, per_category_limit=args.per_category)
    else:
        scraped = scrape_all_categories(per_category_limit=args.per_category)

    if scraped:
        save_to_json(scraped, output_path=args.output)
        print("\n[+] Done! Now run 'node backend/importdata.js' to update MongoDB.")
    else:
        print("[-] No songs scraped.")


if __name__ == "__main__":
    main()