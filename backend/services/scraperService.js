import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Song from "../models/Song.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://pagalnew.com";

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
  Referer: "https://pagalnew.com/",
};

const CATEGORY_MAP = {
  bollywood: { url: `${BASE_URL}/category/bollywood-tracks`, page_slug: "bollywood-mp3-songs", lang: "Bollywood" },
  indipop: { url: `${BASE_URL}/category/indipop-mp3-tracks`, page_slug: "indipop-mp3-tracks", lang: "Indipop" },
  punjabi: { url: `${BASE_URL}/category/punjabi-mp3-tracks`, page_slug: "punjabi-mp3-tracks", lang: "Punjabi" },
  haryanvi: { url: `${BASE_URL}/category/haryanvi-mp3-tracks`, page_slug: "haryanvi-mp3-tracks", lang: "Haryanvi" },
  bhojpuri: { url: `${BASE_URL}/category/bhojpuri-mp3-tracks`, page_slug: "bhojpuri-mp3-tracks", lang: "Bhojpuri" },
};

function sanitizeText(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim();
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
 * Fetch and extract details of a single song detail page from pagalnew.com.
 */
export async function extractSongDetails(songPageUrl, defaultLanguage = "Hindi") {
  if (!songPageUrl || (!songPageUrl.startsWith("http://") && !songPageUrl.startsWith("https://"))) {
    return null;
  }
  try {
    const res = await axios.get(songPageUrl, {
      headers: HEADERS,
      httpsAgent,
      timeout: 8000,
    });
    if (res.status !== 200 || !res.data) return null;

    const $ = cheerio.load(res.data);

    // 1. Title
    let title = "";
    const h1 = $("h1").first();
    if (h1.length) {
      title = sanitizeText(
        h1.text()
          .replace(/\s+Song\s*-\s*.+$/i, "")
          .replace(/\s*(?:song\s*download|mp3\s*download|song|mp3)\s*$/i, "")
      );
    }
    if (!title) {
      const titleTag = $("title").text();
      if (titleTag) title = sanitizeText(titleTag.split("-")[0]);
    }

    // 2. Artist
    let artist = "";
    const singerTag = $("b").filter((_, el) => /Singer\(s\)|Singers?/i.test($(el).text()));
    if (singerTag.length) {
      const raw = singerTag[0].nextSibling?.nodeValue || $(singerTag[0]).parent().text();
      artist = sanitizeText(raw.replace(/^.*Singer\(s\)?[:\s]*/i, ""));
    }
    if (!artist) {
      const metaDesc = $("meta[name='description']").attr("content") || "";
      const m = metaDesc.match(/(?:Sung by|Singer[s]?\s*:)\s*([^,.]+)/i);
      if (m) artist = sanitizeText(m[1]);
    }
    artist = artist || "Various Artists";

    // 3. Language
    let language = defaultLanguage;
    $(".breadcrumb a[href*='/category/']").each((_, el) => {
      const raw = sanitizeText($(el).text()).replace(/\s*(?:mp3|songs?|music|tracks?)\s*.*$/i, "");
      if (raw) {
        language = raw.charAt(0).toUpperCase() + raw.slice(1);
        return false;
      }
    });

    // 4. Thumbnail
    let thumbnailUrl = "";
    $("img").each((_, el) => {
      const src = $(el).attr("data-src") || $(el).attr("src") || "";
      if (src.includes("coverimages") && src.includes("500-500")) {
        thumbnailUrl = new URL(src, BASE_URL).toString();
        return false;
      }
    });
    if (!thumbnailUrl) {
      $("img").each((_, el) => {
        const src = $(el).attr("data-src") || $(el).attr("src") || "";
        if (src.includes("coverimages") && /\.(jpg|png|webp)/i.test(src)) {
          thumbnailUrl = new URL(src, BASE_URL).toString();
          return false;
        }
      });
    }

    // 5. Audio URL (Prefer 320 download link, fallback to audio element, fallback to 128)
    let audioUrl = "";
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("/320-download/")) {
        audioUrl = new URL(href, BASE_URL).toString();
        return false;
      }
    });
    if (!audioUrl) {
      const audioSrc = $("audio").attr("src");
      if (audioSrc) audioUrl = new URL(audioSrc, BASE_URL).toString();
    }
    if (!audioUrl) {
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href.includes("/128-downloads/")) {
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
      thumbnail_url:
        thumbnailUrl ||
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60",
      youtube_url: "",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch all song page URLs from a pagalnew.com album page.
 */
export async function getSongsFromAlbum(albumUrl) {
  const songLinks = [];
  try {
    const res = await axios.get(albumUrl, {
      headers: HEADERS,
      httpsAgent,
      timeout: 8000,
    });
    if (res.status !== 200 || !res.data) return songLinks;
    const $ = cheerio.load(res.data);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("/songs/") && href.endsWith(".html")) {
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
 */
export async function scrapeCategoryPage(categoryKey, pageNum = 1) {
  const catKey = (categoryKey || "punjabi").toLowerCase().trim();
  const catInfo = CATEGORY_MAP[catKey] || {
    url: `${BASE_URL}/category/${catKey}`,
    page_slug: catKey,
    lang: catKey.charAt(0).toUpperCase() + catKey.slice(1),
  };
  const langLabel = catInfo.lang;
  const pageUrl = pageNum <= 1 ? catInfo.url : `${BASE_URL}/category/${catInfo.page_slug}/${pageNum}`;
  const MAX_SONGS_PER_SCRAPE = 50;
  let maxPages = 1;

  // â”€â”€ Step 1: Category listing â†’ collect album links and direct song links â”€â”€
  const albumUrls = [];
  const directSongUrls = [];

  try {
    const res = await axios.get(pageUrl, {
      headers: HEADERS,
      httpsAgent,
      timeout: 8000,
    });
    if (res.status !== 200 || !res.data) {
      return { success: false, message: `HTTP ${res.status}`, songs: [], hasMore: false };
    }
    const $ = cheerio.load(res.data);

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const m = href.match(/\/category\/[^/]+\/(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxPages) maxPages = n;
      }
    });

    const seenAlbums = new Set();
    const seenSongs = new Set();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const full = new URL(href, BASE_URL).toString();
      if (href.includes("/album/") && href.endsWith(".html")) {
        if (!seenAlbums.has(full)) {
          seenAlbums.add(full);
          albumUrls.push(full);
        }
      } else if (href.includes("/songs/") && href.endsWith(".html")) {
        if (!seenSongs.has(full)) {
          seenSongs.add(full);
          directSongUrls.push(full);
        }
      }
    });
  } catch (err) {
    return { success: false, message: err.message, songs: [], hasMore: false };
  }

  // â”€â”€ Step 2: Fetch songs from albums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allSongPageUrls = [...directSongUrls];
  const targetAlbums = albumUrls.slice(0, 15);

  const albumResults = await Promise.allSettled(
    targetAlbums.map((albumUrl) => getSongsFromAlbum(albumUrl))
  );

  for (const r of albumResults) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      for (const link of r.value) {
        if (!allSongPageUrls.includes(link)) {
          allSongPageUrls.push(link);
        }
      }
    }
  }

  if (allSongPageUrls.length === 0) {
    return { success: true, category: catKey, page: pageNum, maxPages, songs: [], newCount: 0, hasMore: pageNum < maxPages };
  }

  // â”€â”€ Step 3: Fast DB Check to Skip Existing Songs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const existingAudioUrls = new Set();
  try {
    const docs = await Song.find({ language: langLabel }, { audio_url: 1, _id: 0 }).lean();
    for (const d of docs) {
      if (d.audio_url) existingAudioUrls.add(d.audio_url.toLowerCase());
    }
  } catch {
    /* ignore */
  }

  // â”€â”€ Step 4: High-Concurrency Detail Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const CONCURRENCY = 15;
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

  // â”€â”€ Step 5: Bulk Upsert to MongoDB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    const savedDocs = await Song.find({
      audio_url: { $in: extractedSongs.map((s) => s.audio_url) },
    }).lean();
    savedSongs.push(...savedDocs);
  } catch {
    savedSongs.push(...extractedSongs);
  }

  // â”€â”€ Step 6: Append to songs.json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
