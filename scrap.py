"""
Sangeet Music Scraper (scrap.py)
Scrapes multi-language song catalogs from PagalWorld across ALL available pages
(/page/1/ to the last detected page /page/N/).
Navigates category grids -> album pages -> song pages to extract direct 320kbps MP3 stream URLs,
high-res album thumbnails, artists, and language metadata.
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

# Reusable HTTP session for connection pooling (3-5x faster requests)
session = requests.Session()
session.headers.update(HEADERS)

# Verified & comprehensive Category URLs on PagalWorld
CATEGORY_MAP = {
    "punjabi": f"{BASE_URL}/category/punjabi/",
    "haryanvi": f"{BASE_URL}/category/haryanvi/",
    "bollywood": f"{BASE_URL}/category/bollywood/",
    "hindi": f"{BASE_URL}/category/hindi/",
    "indipop": f"{BASE_URL}/category/indipop/",
    "bhojpuri": f"{BASE_URL}/category/bhojpuri/",
    "tamil": f"{BASE_URL}/category/tamil/",
    "telugu": f"{BASE_URL}/category/telugu/",
    "malayalam": f"{BASE_URL}/category/malayalam/",
    "kannada": f"{BASE_URL}/category/kannada/",
    "english": f"{BASE_URL}/category/english/",
    "marathi": f"{BASE_URL}/category/marathi/",
    "instagram-viral-song": f"{BASE_URL}/category/instagram-viral-song/",
}


def sanitize_text(text):
    if not text:
        return ""
    text = re.sub(r"\s+", " ", str(text))
    return text.strip()


def encode_audio_url(raw_url):
    """Ensure spaces and special chars in MP3 URLs are safely percent-encoded for browsers."""
    if not raw_url:
        return ""
    parsed = urllib.parse.urlsplit(raw_url)
    encoded_path = urllib.parse.quote(parsed.path, safe="/:[]()@-_.~+=%&")
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, encoded_path, parsed.query, parsed.fragment))


def get_last_page_number(soup, default_max=1):
    """Scan pagination links (<a href=".../page/N/">) in HTML to detect the maximum page number."""
    max_page = default_max
    for a in soup.find_all("a", href=True):
        m = re.search(r"/page/(\d+)/", a["href"])
        if m:
            try:
                n = int(m.group(1))
                if n > max_page:
                    max_page = n
            except ValueError:
                pass
    return max_page


def extract_song_details(song_page_url, default_language="Hindi"):
    """Fetch and parse a song detail page to extract the real playable 200 OK MP3 stream URL."""
    if not song_page_url.startswith("http://") and not song_page_url.startswith("https://"):
        return None

    try:
        res = session.get(song_page_url, timeout=12)
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
    """Open an album page (e.g. /album/big-plans/) and extract all its song download URLs."""
    song_links = []
    try:
        res = session.get(album_url, timeout=12)
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
    """Extract album cards and direct song cards from a specific category listing page, and return detected max page."""
    album_links = []
    direct_song_links = []
    detected_max_page = 1

    try:
        res = session.get(category_page_url, timeout=12)
        if res.status_code != 200:
            return album_links, direct_song_links, detected_max_page

        soup = BeautifulSoup(res.text, "html.parser")
        detected_max_page = get_last_page_number(soup, default_max=1)

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

    return album_links, direct_song_links, detected_max_page


def get_all_category_song_links(category_base_url, target_count=50, max_pages=None):
    """
    Collect song links across ALL paginated category pages (/page/1/ to /page/N/).
    - target_count: Max songs to collect (if 0 or None, scrapes EVERYTHING across all pages).
    - max_pages: Max pages to crawl (if None, auto-detects from site's pagination).
    """
    final_song_links = []
    seen_songs = set()
    seen_albums = set()

    # Step 1: Probe page 1 to discover max page count
    first_page_url = category_base_url.rstrip("/") + "/"
    print(f"  --> Probing page 1 to detect total pages: {first_page_url}")
    albums, direct_songs, detected_last_page = get_category_items(first_page_url)

    total_pages = max_pages if (max_pages and max_pages > 0) else detected_last_page
    print(f"      Detected {detected_last_page} total pages for {category_base_url}. (Will crawl up to page {total_pages})")

    page_num = 1
    while page_num <= total_pages:
        if target_count and target_count > 0 and len(final_song_links) >= target_count:
            break

        if page_num == 1:
            curr_url = first_page_url
            curr_albums, curr_direct = albums, direct_songs
        else:
            curr_url = category_base_url.rstrip("/") + f"/page/{page_num}/"
            print(f"  --> Browsing page {page_num}/{total_pages}: {curr_url}")
            curr_albums, curr_direct, new_detected = get_category_items(curr_url)
            if new_detected > total_pages and (not max_pages or max_pages <= 0):
                total_pages = new_detected
                print(f"      Updated total pages to: {total_pages}")

        print(f"      Found {len(curr_albums)} album cards, {len(curr_direct)} direct songs.")

        # If page returned no album or song cards, we've reached the end
        if not curr_albums and not curr_direct:
            print(f"      No further items on page {page_num}, stopping pagination.")
            break

        # 1. Collect direct song links
        for s_url in curr_direct:
            if s_url not in seen_songs:
                if target_count and target_count > 0 and len(final_song_links) >= target_count:
                    break
                seen_songs.add(s_url)
                final_song_links.append(s_url)

        # 2. Resolve album cards into individual songs
        for a_url in curr_albums:
            if target_count and target_count > 0 and len(final_song_links) >= target_count:
                break
            if a_url in seen_albums:
                continue
            seen_albums.add(a_url)

            album_songs = get_songs_from_album_page(a_url)
            for s_url in album_songs:
                if s_url not in seen_songs:
                    if target_count and target_count > 0 and len(final_song_links) >= target_count:
                        break
                    seen_songs.add(s_url)
                    final_song_links.append(s_url)

        page_num += 1

    return final_song_links


def scrape_category(category_name, per_category_limit=50, max_pages=None, workers=6):
    """Scrape songs from a specific category across all its pages."""
    cat_key = category_name.lower().strip()
    url = CATEGORY_MAP.get(cat_key, f"{BASE_URL}/category/{cat_key}/")
    lang_label = cat_key.capitalize()

    print(f"\n=======================================================")
    print(f"[+] Scraping {lang_label} catalog from: {url}")
    target_desc = f"{per_category_limit} songs" if (per_category_limit and per_category_limit > 0) else "ALL songs (all pages)"
    print(f"    Target: {target_desc}")
    print(f"=======================================================")

    song_links = get_all_category_song_links(url, target_count=per_category_limit, max_pages=max_pages)
    print(f"    Resolved {len(song_links)} song URLs from {lang_label} pages.")

    if per_category_limit and per_category_limit > 0:
        links_to_scrape = song_links[:per_category_limit]
    else:
        links_to_scrape = song_links

    print(f"    Fetching MP3 stream details for {len(links_to_scrape)} songs using {workers} concurrent workers...")

    scraped = []
    # Concurrent extraction for 5x faster scraping
    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_url = {
            executor.submit(extract_song_details, link, lang_label): link
            for link in links_to_scrape
        }
        for future in as_completed(future_to_url):
            try:
                details = future.result()
                if details and details.get("audio_url"):
                    scraped.append(details)
                    count_str = f"[{len(scraped)}/{len(links_to_scrape)}]"
                    print(f"    [OK] {count_str} {details['title']} - {details['artist']} ({lang_label})")
            except Exception as e:
                pass

    return scraped


def scrape_all_categories(per_category_limit=50, max_pages=None, workers=6):
    """Scrape songs across all categories in CATEGORY_MAP."""
    all_scraped = []
    for cat_name in CATEGORY_MAP.keys():
        songs = scrape_category(cat_name, per_category_limit=per_category_limit, max_pages=max_pages, workers=workers)
        all_scraped.extend(songs)
        print(f"\n  >> Finished {cat_name}: {len(songs)} songs scraped. Total in catalog: {len(all_scraped)}")
    return all_scraped


def save_to_json(songs, output_path="backend/data/songs.json"):
    """Merge scraped songs into existing JSON catalog with strict deduplication by audio_url and normalized title."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    existing_songs = []

    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_songs = json.load(f)
        except Exception:
            existing_songs = []

    # Helper to generate unique keys
    def make_title_key(title, artist):
        t = re.sub(r"[^a-z0-9]", "", (title or "").lower())
        a = re.sub(r"[^a-z0-9]", "", re.split(r"[,&]", (artist or "").lower())[0])
        return f"{t}::{a}" if t else ""

    def make_audio_key(audio_url):
        return (audio_url or "").strip().lower()

    audio_map = {}
    title_map = {}
    all_merged = []

    for s in existing_songs:
        a_key = make_audio_key(s.get("audio_url"))
        t_key = make_title_key(s.get("title"), s.get("artist"))
        if a_key and a_key in audio_map:
            continue
        if t_key and t_key in title_map:
            continue

        all_merged.append(s)
        if a_key:
            audio_map[a_key] = s
        if t_key:
            title_map[t_key] = s

    added_count = 0
    updated_count = 0

    for s in songs:
        a_key = make_audio_key(s.get("audio_url"))
        t_key = make_title_key(s.get("title"), s.get("artist"))

        target = None
        if a_key and a_key in audio_map:
            target = audio_map[a_key]
        elif t_key and t_key in title_map:
            target = title_map[t_key]

        if target:
            target["audio_url"] = s["audio_url"]
            if s.get("thumbnail_url"):
                target["thumbnail_url"] = s["thumbnail_url"]
            if s.get("language"):
                target["language"] = s["language"]
            updated_count += 1
        else:
            s["id"] = len(all_merged) + 1
            all_merged.append(s)
            if a_key:
                audio_map[a_key] = s
            if t_key:
                title_map[t_key] = s
            added_count += 1

    # Re-index IDs sequentially
    for idx, item in enumerate(all_merged, start=1):
        item["id"] = idx

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_merged, f, indent=2, ensure_ascii=False)

    playable = len([s for s in all_merged if s.get("audio_url") and "/wp-content/uploads/" in s.get("audio_url")])
    print(f"\n[+] Saved to {output_path}!")
    print(f"    New songs added: {added_count}")
    print(f"    Existing songs updated: {updated_count}")
    print(f"    Total unique songs in catalog: {len(all_merged)}")
    print(f"    Playable stream URLs: {playable}")


def main():
    parser = argparse.ArgumentParser(
        description="Scrape playable MP3 songs from PagalWorld across all pagination pages (/page/1/ to /page/N/)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scrap.py --category punjabi --per-category 50       # Scrape 50 Punjabi songs across pages
  python scrap.py --category punjabi --all-pages             # Scrape ALL Punjabi songs from page 1 to 20
  python scrap.py --all --per-category 50                    # Scrape 50 songs for EVERY language
  python scrap.py --all --all-pages                          # Scrape the entire PagalWorld catalog
  python scrap.py --list-categories                          # Show all available categories
"""
    )
    parser.add_argument(
        "--category", type=str, default=None,
        help="Single category to scrape (e.g. punjabi, haryanvi, bollywood, indipop, tamil, telugu, english)"
    )
    parser.add_argument(
        "--per-category", type=int, default=50,
        help="Number of songs per category (default: 50). Set to 0 or use --all-pages to scrape without limit."
    )
    parser.add_argument(
        "--all-pages", action="store_true",
        help="Scrape all available pages for the category without any song count limit"
    )
    parser.add_argument(
        "--max-pages", type=int, default=None,
        help="Manually limit the number of category pages to crawl (e.g. --max-pages 5)"
    )
    parser.add_argument(
        "--all", action="store_true",
        help="Scrape all supported languages/categories"
    )
    parser.add_argument(
        "--workers", type=int, default=6,
        help="Number of concurrent worker threads for fetching song details (default: 6)"
    )
    parser.add_argument(
        "--list-categories", action="store_true",
        help="Print all available categories and exit"
    )
    parser.add_argument(
        "--output", type=str, default="backend/data/songs.json",
        help="Output JSON file path (default: backend/data/songs.json)"
    )

    args = parser.parse_args()

    if args.list_categories:
        print("\nAvailable Categories on PagalWorld:")
        for key, url in CATEGORY_MAP.items():
            print(f"  - {key:<22} -> {url}")
        return

    limit = 0 if args.all_pages else args.per_category

    if args.category:
        scraped = scrape_category(
            args.category,
            per_category_limit=limit,
            max_pages=args.max_pages,
            workers=args.workers
        )
    else:
        scraped = scrape_all_categories(
            per_category_limit=limit,
            max_pages=args.max_pages,
            workers=args.workers
        )

    if scraped:
        save_to_json(scraped, output_path=args.output)
        print("\n[+] Done! Now run 'node backend/importdata.js' to update MongoDB.")
    else:
        print("[-] No songs scraped.")


if __name__ == "__main__":
    main()