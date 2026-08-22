import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Song from "../models/Song.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://pagalworld.is";

// Ultra-fast HTTP agent with 60 sockets and persistent keepAlive connections
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 60,
  maxFreeSockets: 30,
  keepAliveMsecs: 60000,
});

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
};

const CATEGORY_MAP = {
  punjabi: `${BASE_URL}/category/punjabi/`,
  haryanvi: `${BASE_URL}/category/haryanvi/`,
  bollywood: `${BASE_URL}/category/bollywood/`,
  hindi: `${BASE_URL}/category/hindi/`,
  indipop: `${BASE_URL}/category/indipop/`,
  bhojpuri: `${BASE_URL}/category/bhojpuri/`,
  tamil: `${BASE_URL}/category/tamil/`,
  telugu: `${BASE_URL}/category/telugu/`,
  malayalam: `${BASE_URL}/category/malayalam/`,
  kannada: `${BASE_URL}/category/kannada/`,
  english: `${BASE_URL}/category/english/`,
  marathi: `${BASE_URL}/category/marathi/`,
  "instagram-viral-song": `${BASE_URL}/category/instagram-viral-song/`,
};

function sanitizeText(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

/**
 * Extract only the clean singer name from a song detail page.
 */
function extractCleanArtist($, mainContent) {
  let artist = "";

  // Strategy 1: <td> label/value pairs in table rows
  mainContent.find("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length >= 2) {
      const label = sanitizeText($(cells[0]).text());
      if (/^Singer\(s\)|^Artist\(s\)|^Singers?$/i.test(label)) {
        const rawArtist = sanitizeText($(cells[1]).text());
        if (rawArtist && rawArtist.length < 200) {
          artist = rawArtist;
          return false;
        }
      }
    }
  });

  // Strategy 2: direct text of elements matching Singer(s) label
  if (!artist) {
    mainContent.find("li, p, div, span").each((_, el) => {
      const raw = $(el).clone().find("*").remove().end().text();
      const cleaned = sanitizeText(raw);
      const m = cleaned.match(/^(?:Singer\(s\)|Artist\(s\)|Singers?)\s*[:\-]?\s*(.+)$/i);
      if (m && m[1] && m[1].length < 200) {
        artist = m[1].trim();
        return false;
      }
    });
  }

  // Strategy 3: meta description "sung by <Artist>"
  if (!artist) {
    const metaDesc = $("meta[name='description']").attr("content") || "";
    const m = metaDesc.match(/sung by\s+([^.\n]+)/i);
    if (m) artist = m[1].split(" and ")[0].trim();
  }

  artist = sanitizeText(artist);
  if (artist.length > 150) artist = artist.substring(0, 150).replace(/,?[^,]*$/, "").trim();
  return artist || "Various Artists";
}

function encodeAudioUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl);
    parsed.pathname = encodeURI(decodeURI(parsed.pathname));
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Fetch and extract details of a single song detail page.
 */
export async function extractSongDetails(songPageUrl, defaultLanguage = "Hindi") {
  if (!songPageUrl || (!songPageUrl.startsWith("http://") && !songPageUrl.startsWith("https://"))) {
    return null;
  }
  try {
    const res = await axios.get(songPageUrl, {
      headers: HEADERS,
      httpsAgent,
      timeout: 5000,
    });
    if (res.status !== 200 || !res.data) return null;

    const $ = cheerio.load(res.data);
    const mainContent = $(".main-content").length ? $(".main-content") : $("body");

    // 1. Title
    let title = "";
    const h1 = mainContent.find("h1").first();
    if (h1.length) {
      title = sanitizeText(h1.text().replace(/\s*(?:song\s*download|mp3\s*download|song|mp3)\s*$/i, ""));
    }
    if (!title) {
      const titleTag = $("title").text();
      if (titleTag) title = sanitizeText(titleTag.split("-")[0]);
    }

    // 2. Artist
    const artist = extractCleanArtist($, mainContent);

    // 3. Language
    let language = defaultLanguage;
    const breadcrumbLink = $(".breadcrumb a[href*='/category/']").first();
    if (breadcrumbLink.length) {
      const rawLang = sanitizeText(breadcrumbLink.text());
      if (rawLang) language = rawLang.charAt(0).toUpperCase() + rawLang.slice(1);
    }

    // 4. Thumbnail
    let thumbnailUrl = "";
    mainContent.find("img").each((_, el) => {
      const src = $(el).attr("data-src") || $(el).attr("data-original") || $(el).attr("src") || "";
      if (src.includes("500x500") && src.includes("uploads") && !thumbnailUrl) {
        thumbnailUrl = new URL(src, BASE_URL).toString();
      } else if (src.includes("uploads") && src.includes("wp-content") && !thumbnailUrl) {
        thumbnailUrl = new URL(src, BASE_URL).toString();
      }
    });

    // 5. Audio URL from data-file attributes
    let audioUrl = "";
    const candidates = [];
    $("[data-file]").each((_, el) => {
      const dFile = ($(el).attr("data-file") || "").trim();
      const dYear = ($(el).attr("data-year") || "").trim();
      const dMonth = ($(el).attr("data-month") || "").trim();
      if (dFile) {
        const streamUrl = dYear && dMonth
          ? `https://pagalworld.is/wp-content/uploads/${dYear}/${dMonth}/${dFile}`
          : `https://pagalworld.is/wp-content/uploads/${dFile}`;
        candidates.push({ streamUrl, dFile });
      }
    });

    for (const cand of candidates) {
      if (cand.dFile.includes("320")) { audioUrl = cand.streamUrl; break; }
    }
    if (!audioUrl && candidates.length > 0) audioUrl = candidates[0].streamUrl;

    if (!audioUrl) {
      mainContent.find("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href.includes("/wp-content/uploads/") && href.toLowerCase().endsWith(".mp3")) {
          audioUrl = new URL(href, BASE_URL).toString();
          return false;
        }
      });
    }

    if (!audioUrl || !title) return null;

    return {
      title,
      artist,
      language,
      audio_url: encodeAudioUrl(audioUrl),
      thumbnail_url: thumbnailUrl ||
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
      youtube_url: "",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch all song page URLs from an album page.
 */
export async function getSongsFromAlbum(albumUrl) {
  const songLinks = [];
  try {
    const res = await axios.get(albumUrl, {
      headers: HEADERS,
      httpsAgent,
      timeout: 5000,
    });
    if (res.status !== 200 || !res.data) return songLinks;
    const $ = cheerio.load(res.data);
    const mainContent = $(".main-content").length ? $(".main-content") : $("body");
    mainContent.find("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("/song/") && href.includes("-mp3-download")) {
        const fullUrl = new URL(href, BASE_URL).toString();
        if (!songLinks.includes(fullUrl)) songLinks.push(fullUrl);
      }
    });
  } catch {
    // Ignore failures
  }
  return songLinks;
}

/**
 * Scrape a specific category page in real-time and save new songs to DB + songs.json.
 *
 * Highly optimized with:
 *   1. Connection pooling (60 sockets, gzip/br compression, keepAlive)
 *   2. Parallel album crawling (up to 15 albums at once with immediate collection)
 *   3. High detail concurrency (24 parallel requests)
 *   4. High-performance single-roundtrip MongoDB bulkWrite
 */
export async function scrapeCategoryPage(categoryKey, pageNum = 1) {
  const catKey = (categoryKey || "punjabi").toLowerCase().trim();
  const baseUrl = CATEGORY_MAP[catKey] || `${BASE_URL}/category/${catKey}/`;
  const langLabel = catKey === "instagram-viral-song"
    ? "Instagram viral song"
    : catKey.charAt(0).toUpperCase() + catKey.slice(1);

  const pageUrl = pageNum <= 1 ? baseUrl : `${baseUrl.replace(/\/+$/, "")}/page/${pageNum}/`;
  const MAX_SONGS_PER_SCRAPE = 50;
  let maxPages = 1;

  // ── Step 1: Category listing → collect album links ────────────────────────
  const albumUrls = [];
  try {
    const res = await axios.get(pageUrl, {
      headers: HEADERS,
      httpsAgent,
      timeout: 6000,
    });
    if (res.status !== 200 || !res.data) {
      return { success: false, message: `HTTP ${res.status}`, songs: [], hasMore: false };
    }
    const $ = cheerio.load(res.data);

    $("a[href*='/page/']").each((_, el) => {
      const m = ($(el).attr("href") || "").match(/\/page\/(\d+)\//);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxPages) maxPages = n;
      }
    });

    const seenAlbums = new Set();
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("/album/") && !href.endsWith("/album/")) {
        const full = new URL(href, BASE_URL).toString();
        if (!seenAlbums.has(full)) {
          seenAlbums.add(full);
          albumUrls.push(full);
        }
      }
    });
  } catch (err) {
    return { success: false, message: err.message, songs: [], hasMore: false };
  }

  if (albumUrls.length === 0) {
    return { success: true, category: catKey, page: pageNum, maxPages, songs: [], newCount: 0, hasMore: pageNum < maxPages };
  }

  // ── Step 2: Parallel Album Fetching (up to 15 albums at once) ──────────────
  const seenSongUrls = new Set();
  const allSongPageUrls = [];
  const targetAlbums = albumUrls.slice(0, 15);

  const albumResults = await Promise.allSettled(
    targetAlbums.map(async (albumUrl) => {
      try {
        const r = await axios.get(albumUrl, {
          headers: HEADERS,
          httpsAgent,
          timeout: 5000,
        });
        if (r.status !== 200 || !r.data) return [];
        const $ = cheerio.load(r.data);
        const links = [];
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") || "";
          if (href.includes("/song/") && href.includes("-mp3-download")) {
            const full = new URL(href, BASE_URL).toString();
            if (!seenSongUrls.has(full)) {
              seenSongUrls.add(full);
              links.push(full);
            }
          }
        });
        return links;
      } catch {
        return [];
      }
    })
  );

  for (const r of albumResults) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      allSongPageUrls.push(...r.value);
    }
  }

  if (allSongPageUrls.length === 0) {
    return { success: true, category: catKey, page: pageNum, maxPages, songs: [], newCount: 0, hasMore: pageNum < maxPages };
  }

  // ── Step 3: Fast DB Check to Skip Existing Songs ─────────────────────────
  const existingAudioUrls = new Set();
  try {
    const docs = await Song.find({ language: langLabel }, { audio_url: 1, _id: 0 }).lean();
    for (const d of docs) {
      if (d.audio_url) existingAudioUrls.add(d.audio_url.toLowerCase());
    }
  } catch {
    /* ignore */
  }

  // ── Step 4: High-Concurrency Detail Extraction (Concurrency = 24) ────────
  const CONCURRENCY = 24;
  const extractedSongs = [];
  let idx = 0;

  while (idx < allSongPageUrls.length && extractedSongs.length < MAX_SONGS_PER_SCRAPE) {
    const batch = allSongPageUrls.slice(idx, idx + CONCURRENCY);
    idx += CONCURRENCY;
    const batchResults = await Promise.allSettled(
      batch.map((url) => extractSongDetails(url, langLabel))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value?.audio_url) {
        const key = r.value.audio_url.toLowerCase();
        if (!existingAudioUrls.has(key)) {
          extractedSongs.push(r.value);
          existingAudioUrls.add(key);
        }
      }
      if (extractedSongs.length >= MAX_SONGS_PER_SCRAPE) break;
    }
  }

  if (extractedSongs.length === 0) {
    return { success: true, category: catKey, page: pageNum, maxPages, songs: [], newCount: 0, hasMore: pageNum < maxPages };
  }

  // ── Step 5: Fast Bulk Upsert to MongoDB (Single Roundtrip) ────────────────
  const savedSongs = [];
  try {
    const bulkOps = extractedSongs.map((song) => ({
      updateOne: {
        filter: { audio_url: song.audio_url },
        update: {
          $set: {
            title: song.title,
            artist: song.artist,
            language: song.language,
            audio_url: song.audio_url,
            thumbnail_url: song.thumbnail_url,
            youtube_url: "",
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await Song.bulkWrite(bulkOps, { ordered: false });
    }

    // Retrieve saved documents
    const savedDocs = await Song.find({
      audio_url: { $in: extractedSongs.map((s) => s.audio_url) },
    }).lean();
    savedSongs.push(...savedDocs);
  } catch {
    savedSongs.push(...extractedSongs);
  }

  // ── Step 6: Append to songs.json Asynchronously ───────────────────────────
  try {
    const songsJsonPath = path.join(__dirname, "../data/songs.json");
    if (fs.existsSync(songsJsonPath)) {
      const currentList = JSON.parse(fs.readFileSync(songsJsonPath, "utf8"));
      const audioSet = new Set(currentList.map((s) => (s.audio_url || "").toLowerCase()));
      let added = 0;
      for (const s of extractedSongs) {
        const key = (s.audio_url || "").toLowerCase();
        if (!audioSet.has(key)) {
          audioSet.add(key);
          currentList.push({ ...s, id: currentList.length + 1 });
          added++;
        }
      }
      if (added > 0) fs.writeFileSync(songsJsonPath, JSON.stringify(currentList, null, 2), "utf8");
    }
  } catch {
    /* ignore */
  }

  return {
    success: true,
    category: catKey,
    page: pageNum,
    maxPages,
    songs: savedSongs,
    newCount: savedSongs.length,
    hasMore: pageNum < maxPages,
  };
}

