import axios from "axios";
import Song from "../models/Song.js";
import { scrapeCategoryPage } from "../services/scraperService.js";

const youtubeCache = new Map();
const searchCache = new Map();
const SEARCH_CACHE_TTL = 3 * 60 * 1000; // 3 minutes TTL
const MAX_SEARCH_CACHE_SIZE = 250;

function getCachedSearch(key) {
  const item = searchCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    searchCache.delete(key);
    return null;
  }
  return item.data;
}

function setCachedSearch(key, data) {
  if (searchCache.size >= MAX_SEARCH_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, expiry: Date.now() + SEARCH_CACHE_TTL });
}

const normalizeQuery = (value = "") =>
  value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanText = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .trim();

const toPlainSong = (song) => {
  if (!song) return song;
  if (typeof song.toObject === "function") return song.toObject();
  return song;
};

const normalizeSongString = (value = "") => String(value).trim();

export const normalizeSongRecord = (song = {}) => {
  const plainSong = toPlainSong(song);
  const title = cleanText(plainSong.title || plainSong.name || "Unknown Song");
  const artist = cleanText(plainSong.artist || plainSong.singer || "Unknown Artist");
  const album = cleanText(plainSong.album || "Single");
  const year = cleanText(plainSong.year || "");
  const language = cleanText(plainSong.language || "Unknown");

  return {
    ...plainSong,
    title: title
      .replace(/\s+/g, " ")
      .replace(/\s*[-–—]\s*/g, " - ")
      .replace(/\s{2,}/g, " ")
      .trim(),
    artist: artist
      .replace(/\s+/g, " ")
      .replace(/\s*[-–—]\s*/g, " - ")
      .replace(/\s{2,}/g, " ")
      .trim(),
    album: album || "Single",
    year: year || "",
    language: language
      .replace(/\s+/g, " ")
      .trim(),
  };
};

export const stripRuntimeMediaFields = (song = {}) => {
  return song;
};

export const dedupeSongs = (songs = []) => {
  const seenAudio = new Set();
  const seenTitle = new Set();
  const result = [];

  for (const song of songs) {
    const normalized = normalizeSongRecord(song);
    const titleKey = normalizeSongString(normalized.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const artistKey = normalizeSongString(normalized.artist || "")
      .split(/[,&]/)[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const audioKey = (normalized.audio_url || "").trim().toLowerCase();

    if (!titleKey) continue;

    // Deduplicate by audio_url if present
    if (audioKey) {
      if (seenAudio.has(audioKey)) continue;
      seenAudio.add(audioKey);
    }

    // Deduplicate by title + primary artist
    const comboKey = `${titleKey}::${artistKey}`;
    if (seenTitle.has(comboKey)) continue;
    seenTitle.add(comboKey);

    result.push(normalized);
  }

  return result;
};

export const resolveYouTubeQuery = async (queryText) => {
  const cleanQ = normalizeQuery(queryText);
  if (!cleanQ) return null;
  const cacheKey = cleanQ.toLowerCase();

  if (youtubeCache.has(cacheKey)) {
    return youtubeCache.get(cacheKey);
  }

  const query = encodeURIComponent(cleanQ);

  try {
    const response = await axios.get(`https://www.youtube.com/results?search_query=${query}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      timeout: 5000,
    });

    const html = response.data;
    const videoIdMatch = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    const videoId = videoIdMatch?.[1];

    if (!videoId) {
      return null;
    }

    const result = {
      videoId,
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };

    youtubeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("YouTube lookup failed:", error.message);
    return null;
  }
};

export const resolveYouTubeUrl = async (title, artist) => {
  const normTitle = normalizeSongString(title);
  const normArtist = normalizeSongString(artist);
  const cacheKey = `${normTitle.toLowerCase()}::${normArtist.toLowerCase()}`;

  if (youtubeCache.has(cacheKey)) {
    return youtubeCache.get(cacheKey);
  }

  try {
    const existingSong = await Song.findOne({
      title: new RegExp(`^${normTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i"),
      artist: new RegExp(`^${normArtist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i"),
      youtube_url: { $ne: "" },
    }).lean();

    if (existingSong && existingSong.youtube_url) {
      const videoIdMatch = existingSong.youtube_url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
      const videoId = videoIdMatch?.[1] || "";
      const result = {
        videoId,
        youtube_url: existingSong.youtube_url,
        thumbnail_url: existingSong.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : ""),
      };
      youtubeCache.set(cacheKey, result);
      return result;
    }
  } catch (e) {
    // Ignore query fallback errors
  }

  const combinedQuery = `${normalizeQuery(normTitle)} ${normalizeQuery(normArtist)}`.trim();
  const result = await resolveYouTubeQuery(combinedQuery);

  if (result) {
    youtubeCache.set(cacheKey, result);
    Song.updateMany(
      {
        title: new RegExp(`^${normTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i"),
        artist: new RegExp(`^${normArtist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i"),
      },
      {
        youtube_url: result.youtube_url,
        thumbnail_url: result.thumbnail_url,
      }
    ).catch((err) => console.error("Failed to persist youtube_url to DB:", err.message));
  }

  return result;
};

export const enrichSong = async (song) => {
  const plainSong = toPlainSong(song);
  const cleanedSong = {
    ...plainSong,
    title: normalizeSongString(plainSong.title),
    artist: normalizeSongString(plainSong.artist),
    language: normalizeSongString(plainSong.language),
  };

  if (cleanedSong.youtube_url && cleanedSong.thumbnail_url) {
    return cleanedSong;
  }

  const resolved = await resolveYouTubeUrl(cleanedSong.title, cleanedSong.artist);
  if (!resolved) return cleanedSong;

  return {
    ...cleanedSong,
    ...resolved,
  };
};

// ── In-Memory Catalog & Home Feed Caches for Instant Server Responses ────────
let catalogCache = null;
let catalogCacheExpiry = 0;
const CATALOG_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let homeFeedCache = null;
let homeFeedCacheExpiry = 0;
const HOME_FEED_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let artistsCache = null;
let artistsCacheExpiry = 0;

export const invalidateCatalogCache = () => {
  catalogCache = null;
  catalogCacheExpiry = 0;
  homeFeedCache = null;
  homeFeedCacheExpiry = 0;
};

export const invalidateArtistsCache = () => {
  artistsCache = null;
  artistsCacheExpiry = 0;
};

export const invalidateHomeFeedCache = () => {
  homeFeedCache = null;
  homeFeedCacheExpiry = 0;
};

async function getOrLoadCatalog() {
  const now = Date.now();
  if (catalogCache && now < catalogCacheExpiry) {
    return catalogCache;
  }
  const allSongs = await Song.find({ audio_url: { $exists: true, $ne: "" } })
    .select("title artist album year language audio_url thumbnail_url youtube_url")
    .lean();
  const normalizedSongs = dedupeSongs(allSongs);
  catalogCache = normalizedSongs;
  catalogCacheExpiry = now + CATALOG_CACHE_TTL;
  return normalizedSongs;
}

function buildHomeFeedFromSongs(dedupedSongs) {
  const yearNum = (s) => {
    const y = parseInt(s.year || "", 10);
    return isNaN(y) ? 0 : y;
  };

  // 1. Featured track (pick a standout release with high-res artwork and direct audio)
  const featured = dedupedSongs.find(
    (s) => s.audio_url && s.thumbnail_url && !s.thumbnail_url.includes("ui-avatars") && (s.year === "2026" || s.year === "2025")
  ) || dedupedSongs[0] || null;

  // 2. Fresh (latest year releases first)
  const fresh = [...dedupedSongs].sort((a, b) => yearNum(b) - yearNum(a)).slice(0, 50);

  // 3. Bollywood Spotlight
  const bollywood = dedupedSongs
    .filter((s) => {
      const l = (s.language || "").toLowerCase();
      return l === "bollywood" || l === "hindi";
    })
    .sort((a, b) => yearNum(b) - yearNum(a))
    .slice(0, 50);

  // 4. 90s Evergreen Bollywood (1990-1999)
  const nineties = dedupedSongs
    .filter((s) => {
      const y = yearNum(s);
      const l = (s.language || "").toLowerCase();
      return y >= 1990 && y < 2000 && (l === "bollywood" || l === "hindi" || !l);
    })
    .slice(0, 50);

  // 5. 2000s Golden Era Bollywood (2000-2009)
  const twothousands = dedupedSongs
    .filter((s) => {
      const y = yearNum(s);
      const l = (s.language || "").toLowerCase();
      return y >= 2000 && y < 2010 && (l === "bollywood" || l === "hindi" || !l);
    })
    .slice(0, 50);

  // 6. Trending (diverse mix)
  const trending = [...dedupedSongs].slice(0, 50).reverse();

  // 7. Regional Spotlights
  const regionalLangs = ["Punjabi", "Haryanvi", "Indipop", "Bhojpuri", "Tamil", "Telugu", "Malayalam", "Kannada", "Marathi", "English", "Instagram viral song"];
  const regional = {};
  for (const lang of regionalLangs) {
    const list = dedupedSongs
      .filter((s) => (s.language || "").toLowerCase() === lang.toLowerCase())
      .slice(0, 50);
    if (list.length > 0) {
      regional[lang] = list;
    }
  }

  // 8. Albums summary (compact metadata)
  const albumMap = new Map();
  for (const s of dedupedSongs) {
    const alb = (s.album || "").trim();
    if (!alb || alb.toLowerCase() === "single") continue;
    if (!albumMap.has(alb)) {
      albumMap.set(alb, {
        name: alb,
        coverImage: s.thumbnail_url || "",
        year: s.year || "",
        language: s.language || "",
        artist: s.artist || "",
        songCount: 1,
      });
    } else {
      albumMap.get(alb).songCount++;
    }
  }
  const albums = Array.from(albumMap.values())
    .sort((a, b) => b.songCount - a.songCount)
    .slice(0, 25);

  // 9. Artists summary (compact metadata)
  const artistMap = new Map();
  for (const s of dedupedSongs) {
    const raw = (s.artist || "").trim();
    if (!raw || raw === "Unknown Artist") continue;
    const tokens = raw
      .split(/[,/;&|]|\b(?:ft\.?|feat\.?|featuring|with|and|&)\b/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.length <= 50);
    const uniqueTokens = tokens.length > 0 ? Array.from(new Set(tokens)) : [raw];
    for (const art of uniqueTokens) {
      const k = art.toLowerCase();
      if (!artistMap.has(k)) {
        artistMap.set(k, {
          id: art,
          name: art,
          image: s.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(art)}&background=1c1c1e&color=eab34a`,
          songCount: 1,
        });
      } else {
        artistMap.get(k).songCount++;
      }
    }
  }
  const artists = Array.from(artistMap.values())
    .sort((a, b) => b.songCount - a.songCount)
    .slice(0, 50);

  return {
    featured,
    fresh,
    bollywood,
    nineties,
    twothousands,
    trending,
    regional,
    albums,
    artists,
    totalCatalogCount: dedupedSongs.length,
  };
}

export const getHomeFeed = async (req, res) => {
  try {
    const now = Date.now();
    if (homeFeedCache && now < homeFeedCacheExpiry) {
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json(homeFeedCache);
    }

    const catalog = await getOrLoadCatalog();
    const feed = buildHomeFeedFromSongs(catalog);
    homeFeedCache = feed;
    homeFeedCacheExpiry = now + HOME_FEED_CACHE_TTL;

    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json(feed);
  } catch (err) {
    console.error("Error in getHomeFeed:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllSongs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 0;
    const language = req.query.language || null;

    let normalizedSongs = await getOrLoadCatalog();

    if (language) {
      normalizedSongs = normalizedSongs.filter(
        (s) => (s.language || "").toLowerCase() === language.toLowerCase()
      );
    }

    res.setHeader("Cache-Control", "public, max-age=180");

    if (page > 0 && limit > 0) {
      const total = normalizedSongs.length;
      const start = (page - 1) * limit;
      const paginatedSongs = normalizedSongs.slice(start, start + limit);
      return res.json({
        songs: paginatedSongs,
        total,
        page,
        limit,
        hasMore: start + limit < total,
      });
    }

    res.json(normalizedSongs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSongsByLanguage = async (req, res) => {
  try {
    const language = req.params.language;
    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 0;

    let allSongs = await getOrLoadCatalog();
    const filtered = allSongs.filter(
      (s) => (s.language || "").toLowerCase() === (language || "").toLowerCase()
    );

    res.setHeader("Cache-Control", "public, max-age=180");

    if (page > 0 && limit > 0) {
      const total = filtered.length;
      const start = (page - 1) * limit;
      const paginatedSongs = filtered.slice(start, start + limit);
      return res.json({
        songs: paginatedSongs,
        total,
        page,
        limit,
        hasMore: start + limit < total,
      });
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getArtists = async (req, res) => {
  try {
    if (artistsCache && Date.now() < artistsCacheExpiry) {
      res.setHeader("Cache-Control", "public, max-age=180");
      return res.json(artistsCache);
    }

    const dedupedSongs = await getOrLoadCatalog();
    const artistMap = new Map();

    dedupedSongs.forEach((song) => {
      const cleaned = normalizeSongRecord(song);
      const rawName = cleaned.artist;
      if (!rawName || rawName === "Unknown Artist") return;

      const tokens = rawName
        .split(/[,/;&|]|\b(?:ft\.?|feat\.?|featuring|with|and|&)\b/i)
        .map((a) => a.trim())
        .filter((a) => a.length >= 2 && a.length <= 50);

      const uniqueTokens = tokens.length > 0 ? Array.from(new Set(tokens)) : [rawName.trim()];

      uniqueTokens.forEach((individualArtist) => {
        const artistKey = individualArtist.toLowerCase();
        if (!artistMap.has(artistKey)) {
          artistMap.set(artistKey, {
            id: individualArtist,
            name: individualArtist,
            image: song.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(individualArtist)}&background=1c1c1e&color=eab34a`,
            songCount: 1,
          });
        } else {
          artistMap.get(artistKey).songCount++;
        }
      });
    });

    const artists = Array.from(artistMap.values())
      .sort((a, b) => b.songCount - a.songCount);

    artistsCache = artists;
    artistsCacheExpiry = Date.now() + 10 * 60 * 1000;

    res.setHeader("Cache-Control", "public, max-age=180");
    res.json(artists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resolveSong = async (req, res) => {
  const { title, artist } = req.query;

  if (!title || !artist) {
    return res.status(400).json({ message: "title and artist are required" });
  }

  const result = await resolveYouTubeUrl(title, artist);
  if (!result) {
    return res.status(404).json({ message: "Could not resolve YouTube video" });
  }

  return res.json(result);
};

export const searchYoutube = async (req, res) => {
  const { query } = req.query;

  if (!query || !String(query).trim()) {
    return res.status(400).json({ message: "query is required" });
  }

  const result = await resolveYouTubeQuery(String(query));
  if (!result) {
    return res.status(404).json({ message: "Could not find a matching YouTube video" });
  }

  return res.json(result);
};

export const scrapeCategorySongs = async (req, res) => {
  try {
    const category = req.params.category || req.query.category || req.body?.category || "punjabi";
    const page = parseInt(req.query.page || req.body?.page, 10) || 1;

    const result = await scrapeCategoryPage(category, page);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, songs: [] });
  }
};

export const searchSongs = async (req, res) => {
  try {
    const rawQuery = String(req.query.q || req.query.query || "").trim();
    if (!rawQuery) {
      return res.json([]);
    }

    const cacheKey = rawQuery.toLowerCase();
    const cached = getCachedSearch(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=120");
      return res.json(cached);
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 60, 100);
    const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeRegex = new RegExp(escaped, "i");
    const prefixRegex = new RegExp(`^${escaped}`, "i");

    const [prefixMatches, substringMatches] = await Promise.all([
      Song.find({
        audio_url: { $exists: true, $ne: "" },
        $or: [{ title: prefixRegex }, { artist: prefixRegex }],
      })
        .select("title artist album year language audio_url thumbnail_url youtube_url")
        .limit(limit)
        .lean(),
      Song.find({
        audio_url: { $exists: true, $ne: "" },
        $or: [{ title: safeRegex }, { artist: safeRegex }, { language: safeRegex }, { album: safeRegex }],
      })
        .select("title artist album year language audio_url thumbnail_url youtube_url")
        .limit(limit)
        .lean(),
    ]);

    const combined = [...prefixMatches, ...substringMatches];
    const deduped = dedupeSongs(combined).slice(0, limit);

    setCachedSearch(cacheKey, deduped);
    res.setHeader("Cache-Control", "public, max-age=120");
    return res.json(deduped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Albums ────────────────────────────────────────────────────────────────────

let albumsCache = null;
let albumsCacheExpiry = 0;

export const getAlbums = async (req, res) => {
  try {
    const language = req.query.language || null;
    const year = req.query.year || null;
    const includeSongs = req.query.includeSongs === "true";

    if (!language && !year && !includeSongs && albumsCache && Date.now() < albumsCacheExpiry) {
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json(albumsCache);
    }

    const matchStage = { audio_url: { $exists: true, $ne: "" }, album: { $exists: true, $nin: ["", "Single"] } };
    if (language) matchStage.language = language;
    if (year) matchStage.year = year;

    const groupFields = {
      _id: "$album",
      name: { $first: "$album" },
      coverImage: { $first: "$thumbnail_url" },
      year: { $first: "$year" },
      language: { $first: "$language" },
      artist: { $first: "$artist" },
      songCount: { $sum: 1 },
    };

    if (includeSongs) {
      groupFields.songs = {
        $push: {
          _id: "$_id",
          title: "$title",
          artist: "$artist",
          audio_url: "$audio_url",
          thumbnail_url: "$thumbnail_url",
          youtube_url: "$youtube_url",
          language: "$language",
          year: "$year",
          album: "$album",
        },
      };
    }

    const albums = await Song.aggregate([
      { $match: matchStage },
      { $group: groupFields },
      { $sort: { year: -1, songCount: -1, name: 1 } },
    ]);

    if (!language && !year && !includeSongs) {
      albumsCache = albums;
      albumsCacheExpiry = Date.now() + 10 * 60 * 1000;
    }

    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(albums);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSongsByAlbum = async (req, res) => {
  try {
    const albumName = decodeURIComponent(req.params.name || "");
    if (!albumName) return res.status(400).json({ message: "Album name required" });

    const songs = await Song.find({
      album: new RegExp(`^${albumName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      audio_url: { $exists: true, $ne: "" },
    }).lean();

    if (!songs.length) return res.status(404).json({ message: "Album not found" });

    const deduped = dedupeSongs(songs);
    const sample = deduped[0] || {};

    res.json({
      name: albumName,
      coverImage: sample.thumbnail_url || "",
      releaseYear: sample.year || "",
      artist: sample.artist || "",
      language: sample.language || "",
      songCount: deduped.length,
      songs: deduped,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getYears = async (req, res) => {
  try {
    const language = req.query.language || null;
    const matchStage = { audio_url: { $exists: true, $ne: "" }, year: { $exists: true, $ne: "" } };
    if (language) matchStage.language = language;

    const years = await Song.aggregate([
      { $match: matchStage },
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    res.json(years.map((y) => ({ year: y._id, count: y.count })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
