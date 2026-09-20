import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import mongoose from "mongoose";
import Song, { inferYear, inferAlbum } from "../models/Song.js";
import { scrapeCategoryPage } from "../services/scraperService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── YouTube & Search helpers ───────────────────────────────────────────────────

const youtubeCache = new Map();
const searchCache = new Map();
const SEARCH_CACHE_TTL = 3 * 60 * 1000; // 3 minutes TTL
const MAX_SEARCH_CACHE_SIZE = 250;
let cachedLocalSongs = null;

// Read and cache local JSON songs fallback
export const getLocalSongs = () => {
  if (cachedLocalSongs && cachedLocalSongs.length > 0) {
    return cachedLocalSongs;
  }
  const possiblePaths = [
    path.join(__dirname, "../data/songs.json"),
    path.join(process.cwd(), "backend/data/songs.json"),
    path.join(process.cwd(), "data/songs.json"),
    path.join(process.cwd(), "../backend/data/songs.json"),
  ];
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedLocalSongs = parsed;
          return cachedLocalSongs;
        }
      }
    } catch (err) {
      console.error(`Failed loading songs from ${filePath}:`, err.message);
    }
  }
  return [];
};

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
  const rawAlbum = cleanText(plainSong.album || "");
  const rawYear = cleanText(plainSong.year || "");
  const language = cleanText(plainSong.language || "Unknown");

  const album = (rawAlbum && rawAlbum !== "Single") ? rawAlbum : inferAlbum(plainSong);
  const year = rawYear || inferYear(plainSong);

  // If a song document was missing album/year and has a MongoDB _id, persist it in the background
  if (plainSong._id && (!plainSong.album || !plainSong.year) && mongoose.connection.readyState === 1) {
    Song.updateOne(
      { _id: plainSong._id },
      { $set: { album, year } }
    ).catch(() => {});
  }

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

    if (audioKey) {
      if (seenAudio.has(audioKey)) continue;
      seenAudio.add(audioKey);
    }

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

  if (mongoose.connection.readyState === 1) {
    try {
      const existingSong = await Song.findOne({
        title: new RegExp(`^${normTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        artist: new RegExp(`^${normArtist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
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
  }

  const combinedQuery = `${normalizeQuery(normTitle)} ${normalizeQuery(normArtist)}`.trim();
  const result = await resolveYouTubeQuery(combinedQuery);

  if (result && mongoose.connection.readyState === 1) {
    youtubeCache.set(cacheKey, result);
    Song.updateMany(
      {
        title: new RegExp(`^${normTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        artist: new RegExp(`^${normArtist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
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

// ── Small result-set caches (NOT full catalog) ────────────────────────────────
// Each cache stores at most ~50 songs, so memory stays tiny.

const SECTION_TTL = 10 * 60 * 1000; // 10 minutes

let homeFeedCache = null;
let homeFeedCacheExpiry = 0;

let discoverFeedCache = null;
let discoverFeedCacheExpiry = 0;

let artistsCache = null;
let artistsCacheExpiry = 0;

export const invalidateCatalogCache = () => {
  homeFeedCache = null;
  homeFeedCacheExpiry = 0;
  discoverFeedCache = null;
  discoverFeedCacheExpiry = 0;
};

export const invalidateArtistsCache = () => {
  artistsCache = null;
  artistsCacheExpiry = 0;
};

export const invalidateHomeFeedCache = () => {
  homeFeedCache = null;
  homeFeedCacheExpiry = 0;
};

// Shared field projection — never pull full documents
const SONG_FIELDS = "title artist album year language audio_url thumbnail_url youtube_url";

// Helper: run a DB query that returns at most `limit` songs
async function fetchSongs({ match = {}, sort = {}, limit = 50 } = {}) {
  const base = { audio_url: { $exists: true, $ne: "" }, ...match };
  return Song.find(base)
    .select(SONG_FIELDS)
    .sort(sort)
    .limit(limit)
    .lean();
}

// ── Home feed — all sections built via targeted DB queries ────────────────────

async function buildHomeFeed() {
  const regionalLangs = [
    "Punjabi", "Haryanvi", "Indipop", "Bhojpuri",
    "Tamil", "Telugu", "Malayalam", "Kannada", "Marathi",
    "English", "Instagram viral song",
  ];

  // Run every section query in parallel
  const [
    featuredArr,
    fresh,
    bollywood,
    nineties,
    twothousands,
    trending,
    totalDoc,
    albumsRaw,
    artistsRaw,
    ...regionalArrays
  ] = await Promise.all([
    // Featured: one standout recent Hindi track
    Song.findOne({
      audio_url: { $exists: true, $ne: "" },
      thumbnail_url: { $exists: true, $ne: "" },
      language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] },
      year: { $in: ["2026", "2025", "2024"] },
    })
      .select(SONG_FIELDS)
      .lean(),

    // Fresh on Sangeet: Latest Hindi & Bollywood songs, newest year first
    fetchSongs({
      match: { language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] } },
      sort: { year: -1, _id: -1 },
      limit: 80,
    }),

    // Bollywood / Hindi (used for quick-mix cards)
    fetchSongs({
      match: { language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] } },
      sort: { year: -1 },
      limit: 80,
    }),

    // 90s
    fetchSongs({
      match: {
        year: { $gte: "1990", $lte: "1999" },
        language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] },
      },
      sort: { year: -1 },
      limit: 60,
    }),

    // 2000s
    fetchSongs({
      match: {
        year: { $gte: "2000", $lte: "2009" },
        language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] },
      },
      sort: { year: -1 },
      limit: 60,
    }),

    // Trending in India: All Bollywood / Hindi songs sorted latest year first
    fetchSongs({
      match: {
        language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] },
      },
      sort: { year: -1, _id: -1 },
      limit: 100,
    }),

    // Total count — just a number, no documents loaded
    Song.countDocuments({ audio_url: { $exists: true, $ne: "" } }),

    // Albums summary — aggregate in MongoDB
    Song.aggregate([
      { $match: { audio_url: { $exists: true, $ne: "" }, album: { $exists: true, $nin: ["", "Single"] } } },
      {
        $group: {
          _id: "$album",
          name: { $first: "$album" },
          coverImage: { $first: "$thumbnail_url" },
          year: { $first: "$year" },
          language: { $first: "$language" },
          artist: { $first: "$artist" },
          songCount: { $sum: 1 },
        },
      },
      { $sort: { songCount: -1 } },
      { $limit: 25 },
    ]),

    // Top artists — aggregate in MongoDB
    Song.aggregate([
      { $match: { audio_url: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$artist",
          name: { $first: "$artist" },
          image: { $first: "$thumbnail_url" },
          songCount: { $sum: 1 },
        },
      },
      { $sort: { songCount: -1 } },
      { $limit: 50 },
    ]),

    // Regional sections — one query per language, 100 songs latest year first
    ...regionalLangs.map((lang) =>
      fetchSongs({
        match: { language: { $regex: new RegExp(`^${lang}$`, "i") } },
        sort: { year: -1, _id: -1 },
        limit: 100,
      })
    ),
  ]);

  // Assemble regional map
  const regional = {};
  regionalLangs.forEach((lang, i) => {
    if (regionalArrays[i] && regionalArrays[i].length > 0) {
      regional[lang] = regionalArrays[i];
    }
  });

  const topArtists = ["arijit singh", "diljit dosanjh", "badshah", "shreya ghoshal", "neha kakkar", "guru randhawa", "ap dhillon", "masoom sharma", "khasa aala chahar", "renuka panwar", "r nait", "sumit goswami", "sidhu moose wala", "karan aujla", "anuv jain", "prateek kuhad", "jubin nautiyal", "armaan malik", "atif aslam"];

  // Normalise artists from aggregation
  const artists = (artistsRaw || [])
    .filter((a) => a.name && a.name !== "Unknown Artist")
    .map((a) => ({
      id: a.name,
      name: a.name,
      image: a.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=1c1c1e&color=eab34a`,
      songCount: a.songCount,
      verified: topArtists.includes((a.name || "").toLowerCase()) || a.songCount >= 3,
    }));

  return {
    featured: featuredArr || fresh[0] || null,
    fresh,
    bollywood,
    nineties,
    twothousands,
    trending,
    regional,
    albums: albumsRaw || [],
    artists,
    totalCatalogCount: totalDoc,
  };
}

// ── Discover Feed — all sections built via targeted DB queries ────────────────

const MAINSTREAM_ARTIST_NAMES = [
  "arijit singh", "diljit dosanjh", "badshah", "shreya ghoshal",
  "neha kakkar", "guru randhawa", "ap dhillon", "yo yo honey singh",
  "karan aujla", "sidhu moose wala", "b praak", "pritam", "atif aslam",
  "jubin nautiyal", "armaan malik", "vishal mishra", "darshan raval",
];

async function buildDiscoverFeed() {
  const recentYears = ["2026", "2025", "2024", "2023", "2022"];

  const [
    todaysPicks,
    newVoicesRecent,
    ninetiesClassics,
    twothousandsHits,
    twentyTensHits,
    editorsPicks,
    hiddenGems,
    risingNow,
  ] = await Promise.all([
    // 1. Today's Top Picks — recent Hindi/Bollywood tracks
    fetchSongs({
      match: {
        language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] },
        year: { $in: recentYears },
      },
      sort: { year: -1, _id: -1 },
      limit: 60,
    }),

    // 2. New Voices — recent tracks excluding mainstream artists
    fetchSongs({
      match: {
        year: { $in: recentYears },
        artist: { $nin: MAINSTREAM_ARTIST_NAMES.map((n) => new RegExp(`^${n}$`, "i")) },
      },
      sort: { year: -1, _id: -1 },
      limit: 60,
    }),

    // 3. 90s Evergreen Bollywood
    fetchSongs({
      match: {
        year: { $gte: "1990", $lte: "1999" },
        language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] },
      },
      sort: { year: -1 },
      limit: 60,
    }),

    // 4. 2000s Golden Era Bollywood
    fetchSongs({
      match: {
        year: { $gte: "2000", $lte: "2009" },
        language: { $in: ["Bollywood", "Hindi", "bollywood", "hindi"] },
      },
      sort: { year: -1 },
      limit: 60,
    }),

    // 5. 2010s Blockbuster Anthems
    fetchSongs({
      match: {
        year: { $gte: "2010", $lte: "2019" },
      },
      sort: { year: -1 },
      limit: 60,
    }),

    // 6. Editor's Choice — mainstream superstar chartbusters
    fetchSongs({
      match: {
        artist: { $in: MAINSTREAM_ARTIST_NAMES.map((n) => new RegExp(`^${n}$`, "i")) },
      },
      sort: { year: -1, _id: -1 },
      limit: 60,
    }),

    // 7. Hidden Gems — indipop / acoustic
    fetchSongs({
      match: {
        $or: [
          { language: { $regex: /indipop/i } },
          { album: { $regex: /single/i } },
          { title: { $regex: /acoustic/i } },
        ],
      },
      sort: { year: -1 },
      limit: 60,
    }),

    // 8. Recently Rising — Punjabi / viral / remix
    fetchSongs({
      match: {
        $or: [
          { language: { $regex: /punjabi|haryanvi|viral/i } },
          { title: { $regex: /remix/i } },
        ],
      },
      sort: { year: -1, _id: -1 },
      limit: 60,
    }),
  ]);

  // If New Voices is still thin, fall back to any non-mainstream recent artists
  let finalNewVoices = newVoicesRecent;
  if (finalNewVoices.length < 10) {
    finalNewVoices = await fetchSongs({
      match: {
        year: { $in: [...recentYears, "2021", "2020"] },
      },
      sort: { year: -1, _id: -1 },
      limit: 60,
    });
  }

  return {
    todaysPicks,
    newVoices: finalNewVoices,
    ninetiesClassics,
    twothousandsHits,
    twentyTensHits,
    editorsPicks,
    hiddenGems,
    risingNow,
  };
}

// ── Route handlers ────────────────────────────────────────────────────────────

export const getDiscoverFeed = async (req, res) => {
  try {
    const now = Date.now();
    if (discoverFeedCache && now < discoverFeedCacheExpiry) {
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json(discoverFeedCache);
    }

    const feed = await buildDiscoverFeed();
    discoverFeedCache = feed;
    discoverFeedCacheExpiry = now + SECTION_TTL;

    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json(feed);
  } catch (err) {
    console.error("Error in getDiscoverFeed:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getHomeFeed = async (req, res) => {
  try {
    const now = Date.now();
    if (homeFeedCache && now < homeFeedCacheExpiry) {
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json(homeFeedCache);
    }

    const feed = await buildHomeFeed();
    homeFeedCache = feed;
    homeFeedCacheExpiry = now + SECTION_TTL;

    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json(feed);
  } catch (err) {
    console.error("Error in getHomeFeed:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllSongs = async (req, res) => {
  try {
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || (isPaginated ? 50 : 200), 200);
    const language = req.query.language || null;

    const match = { audio_url: { $exists: true, $ne: "" } };
    if (language) match.language = new RegExp(`^${language}$`, "i");

    if (mongoose.connection.readyState === 1) {
      if (isPaginated) {
        const [total, songs] = await Promise.all([
          Song.countDocuments(match),
          Song.find(match)
            .select(SONG_FIELDS)
            .sort({ year: -1, title: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ]);

        res.setHeader("Cache-Control", "public, max-age=180");
        return res.json({
          songs,
          total,
          page,
          limit,
          hasMore: page * limit < total,
        });
      }

      const songs = await Song.find(match)
        .select(SONG_FIELDS)
        .sort({ year: -1, _id: -1 })
        .limit(limit)
        .lean();

      res.setHeader("Cache-Control", "public, max-age=180");
      return res.json(songs);
    }

    // Fallback if DB not connected
    let allSongs = getLocalSongs().filter((s) => s.audio_url && s.audio_url.trim() !== "");
    if (language) {
      allSongs = allSongs.filter((s) => (s.language || "").toLowerCase() === language.toLowerCase());
    }
    const normalizedSongs = dedupeSongs(allSongs);
    if (isPaginated) {
      const startIndex = (page - 1) * limit;
      const songs = normalizedSongs.slice(startIndex, startIndex + limit);
      return res.json({
        songs,
        total: normalizedSongs.length,
        page,
        limit,
        hasMore: startIndex + limit < normalizedSongs.length,
      });
    }
    res.json(normalizedSongs.slice(0, limit));
  } catch (err) {
    console.error("Error in getAllSongs:", err.message);
    const local = dedupeSongs(getLocalSongs().filter((s) => s.audio_url));
    res.json(local);
  }
};

export const getSongsByLanguage = async (req, res) => {
  try {
    const language = req.params.language;
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || (isPaginated ? 50 : 200), 200);

    const match = {
      audio_url: { $exists: true, $ne: "" },
      language: new RegExp(`^${language}$`, "i"),
    };

    if (mongoose.connection.readyState === 1) {
      if (isPaginated) {
        const [total, songs] = await Promise.all([
          Song.countDocuments(match),
          Song.find(match)
            .select(SONG_FIELDS)
            .sort({ year: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        ]);

        res.setHeader("Cache-Control", "public, max-age=180");
        return res.json({
          songs,
          total,
          page,
          limit,
          hasMore: page * limit < total,
        });
      }

      const songs = await Song.find(match)
        .select(SONG_FIELDS)
        .sort({ year: -1 })
        .limit(limit)
        .lean();

      res.setHeader("Cache-Control", "public, max-age=180");
      return res.json(songs);
    }

    // Local fallback
    const langKey = (language || "").trim().toLowerCase();
    const allSongs = getLocalSongs().filter(
      (s) => s.audio_url && s.audio_url.trim() !== "" && (s.language || "").trim().toLowerCase() === langKey
    );
    const normalizedSongs = dedupeSongs(allSongs);
    if (isPaginated) {
      const startIndex = (page - 1) * limit;
      return res.json({
        songs: normalizedSongs.slice(startIndex, startIndex + limit),
        total: normalizedSongs.length,
        page,
        limit,
        hasMore: startIndex + limit < normalizedSongs.length,
      });
    }
    res.json(normalizedSongs);
  } catch (err) {
    console.error("Error in getSongsByLanguage:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getArtists = async (req, res) => {
  try {
    if (artistsCache && Date.now() < artistsCacheExpiry) {
      res.setHeader("Cache-Control", "public, max-age=180");
      return res.json(artistsCache);
    }

    const topArtists = ["arijit singh", "diljit dosanjh", "badshah", "shreya ghoshal", "neha kakkar", "guru randhawa", "ap dhillon", "masoom sharma", "khasa aala chahar", "renuka panwar", "r nait", "sumit goswami", "sidhu moose wala", "karan aujla", "anuv jain", "prateek kuhad", "jubin nautiyal", "armaan malik", "atif aslam"];

    if (mongoose.connection.readyState === 1) {
      // Aggregate in MongoDB — no full document load
      const raw = await Song.aggregate([
        { $match: { audio_url: { $exists: true, $ne: "" } } },
        {
          $group: {
            _id: "$artist",
            name: { $first: "$artist" },
            image: { $first: "$thumbnail_url" },
            songCount: { $sum: 1 },
          },
        },
        { $sort: { songCount: -1 } },
        { $limit: 500 },
      ]);

      const artists = raw
        .filter((a) => a.name && a.name !== "Unknown Artist")
        .map((a) => ({
          id: a.name,
          name: a.name,
          image: a.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=1c1c1e&color=eab34a`,
          songCount: a.songCount,
          verified: topArtists.includes((a.name || "").toLowerCase()) || a.songCount >= 3,
        }));

      artistsCache = artists;
      artistsCacheExpiry = Date.now() + SECTION_TTL;

      res.setHeader("Cache-Control", "public, max-age=180");
      return res.json(artists);
    }

    // Local fallback
    const songs = getLocalSongs().filter((s) => s.audio_url && s.audio_url.trim() !== "");
    const dedupedSongs = dedupeSongs(songs);
    const artistMap = new Map();

    dedupedSongs.forEach((song) => {
      const cleaned = normalizeSongRecord(song);
      const rawName = cleaned.artist;
      if (!rawName || rawName === "Unknown Artist") return;
      const normalizedName = rawName.replace(/\s+/g, " ").trim();
      const artistKey = normalizedName.toLowerCase();

      if (!artistMap.has(artistKey)) {
        artistMap.set(artistKey, {
          id: normalizedName,
          name: normalizedName,
          image: cleaned.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedName)}&background=18181b&color=eab34a`,
          songCount: 0,
        });
      }

      const entry = artistMap.get(artistKey);
      entry.songCount += 1;
      if (!entry.image && cleaned.thumbnail_url) entry.image = cleaned.thumbnail_url;
    });

    const artists = Array.from(artistMap.values()).map((artist) => ({
      ...artist,
      verified: topArtists.includes(artist.name.toLowerCase()) || artist.songCount >= 3,
    }));

    res.json(artists);
  } catch (err) {
    console.error("Error in getArtists:", err.message);
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
    const limit = Math.min(parseInt(req.query.limit, 10) || 60, 100);

    if (!rawQuery) {
      return res.json([]);
    }

    const cacheKey = `${rawQuery.toLowerCase()}::${limit}`;
    const cached = getCachedSearch(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=120");
      return res.json(cached);
    }

    let deduped = [];

    if (mongoose.connection.readyState === 1) {
      const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const safeRegex = new RegExp(escaped, "i");
      const prefixRegex = new RegExp(`^${escaped}`, "i");

      const [prefixMatches, substringMatches] = await Promise.all([
        Song.find({
          audio_url: { $exists: true, $ne: "" },
          $or: [{ title: prefixRegex }, { artist: prefixRegex }],
        })
          .select(SONG_FIELDS)
          .limit(limit)
          .lean(),
        Song.find({
          audio_url: { $exists: true, $ne: "" },
          $or: [{ title: safeRegex }, { artist: safeRegex }, { language: safeRegex }, { album: safeRegex }],
        })
          .select(SONG_FIELDS)
          .limit(limit)
          .lean(),
      ]);

      const combined = [...prefixMatches, ...substringMatches];
      deduped = dedupeSongs(combined).slice(0, limit);
    }

    if (!deduped || deduped.length === 0) {
      const q = rawQuery.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);

      const matchedSongs = getLocalSongs().filter((s) => {
        if (!s.audio_url || s.audio_url.trim() === "") return false;
        const title = (s.title || "").toLowerCase();
        const artist = (s.artist || "").toLowerCase();
        const lang = (s.language || "").toLowerCase();

        if (title.includes(q) || artist.includes(q) || lang.includes(q)) return true;
        if (tokens.length > 1) {
          return tokens.every((tok) => title.includes(tok) || artist.includes(tok) || lang.includes(tok));
        }
        return false;
      });

      const qLower = rawQuery.toLowerCase();
      deduped = dedupeSongs(matchedSongs)
        .map((s) => {
          const title = (s.title || "").toLowerCase();
          const artist = (s.artist || "").toLowerCase();
          let score = 0;
          if (title === qLower) score += 100;
          else if (title.startsWith(qLower)) score += 60;
          else if (title.includes(qLower)) score += 35;
          if (artist === qLower) score += 80;
          else if (artist.startsWith(qLower)) score += 50;
          else if (artist.includes(qLower)) score += 25;
          return { song: s, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((item) => item.song)
        .slice(0, limit);
    }

    setCachedSearch(cacheKey, deduped);
    res.setHeader("Cache-Control", "public, max-age=120");
    return res.json(deduped);
  } catch (err) {
    console.error("Error in searchSongs:", err.message);
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

    let albums = [];
    if (mongoose.connection.readyState === 1) {
      try {
        albums = await Song.aggregate([
          { $match: matchStage },
          { $group: groupFields },
          { $sort: { year: -1, songCount: -1, name: 1 } },
        ]);
      } catch (aggErr) {
        console.warn("getAlbums agg error:", aggErr.message);
      }
    }

    if (!albums || albums.length === 0) {
      const local = getLocalSongs().filter((s) => s.audio_url && s.album && s.album !== "Single");
      const map = new Map();
      for (const s of local) {
        if (language && (s.language || "").toLowerCase() !== language.toLowerCase()) continue;
        if (year && String(s.year || "") !== String(year)) continue;
        if (!map.has(s.album)) {
          map.set(s.album, {
            _id: s.album,
            name: s.album,
            coverImage: s.thumbnail_url || "",
            year: s.year || "",
            language: s.language || "",
            artist: s.artist || "",
            songCount: 0,
            songs: [],
          });
        }
        const item = map.get(s.album);
        item.songCount += 1;
        if (includeSongs) {
          item.songs.push(s);
        }
      }
      albums = Array.from(map.values()).sort((a, b) => parseInt(b.year || 0, 10) - parseInt(a.year || 0, 10));
    }

    if (!language && !year && !includeSongs && albums.length > 0) {
      albumsCache = albums;
      albumsCacheExpiry = Date.now() + SECTION_TTL;
    }

    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(albums);
  } catch (err) {
    console.error("Error in getAlbums:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getSongsByArtist = async (req, res) => {
  try {
    let artistName = req.params.name || "";
    try {
      artistName = decodeURIComponent(artistName);
    } catch (_) {}
    artistName = artistName.trim();
    if (!artistName) return res.status(400).json({ message: "Artist name required" });

    const escaped = artistName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    if (mongoose.connection.readyState === 1) {
      const songs = await Song.find({
        $or: [
          { artist: regex },
          { title: regex },
        ],
        audio_url: { $exists: true, $ne: "" },
      })
        .select(SONG_FIELDS)
        .sort({ year: -1 })
        .limit(200)
        .lean();

      const deduped = dedupeSongs(songs);
      res.setHeader("Cache-Control", "public, max-age=180");
      return res.json(deduped);
    }

    // Local dataset fallback
    const allLocal = getLocalSongs().filter((s) => s.audio_url && s.audio_url.trim() !== "");
    const matched = allLocal.filter((s) => {
      const art = (s.artist || "").toLowerCase();
      const tit = (s.title || "").toLowerCase();
      const target = artistName.toLowerCase();
      return art.includes(target) || tit.includes(target);
    });

    const deduped = dedupeSongs(matched);
    res.setHeader("Cache-Control", "public, max-age=180");
    return res.json(deduped);
  } catch (err) {
    console.error("Error in getSongsByArtist:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getSongsByAlbum = async (req, res) => {
  try {
    let albumName = req.params.name || "";
    try {
      albumName = decodeURIComponent(albumName);
    } catch (_) {}
    albumName = albumName.trim();
    if (!albumName) return res.status(400).json({ message: "Album name required" });

    let songs = [];
    const escaped = albumName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (mongoose.connection.readyState === 1) {
      try {
        // 1. Exact match
        songs = await Song.find({
          album: new RegExp(`^${escaped}$`, "i"),
          audio_url: { $exists: true, $ne: "" },
        })
          .select(SONG_FIELDS)
          .sort({ year: -1 })
          .lean();

        // 2. Substring match if exact match returned nothing
        if (!songs.length) {
          songs = await Song.find({
            album: new RegExp(escaped, "i"),
            audio_url: { $exists: true, $ne: "" },
          })
            .select(SONG_FIELDS)
            .sort({ year: -1 })
            .lean();
        }
      } catch (dbErr) {
        console.warn("getSongsByAlbum DB error:", dbErr.message);
      }
    }

    // Fallback to local songs.json if DB unavailable or returned nothing
    if (!songs.length) {
      const local = getLocalSongs();
      const lower = albumName.toLowerCase();
      songs = local.filter(
        (s) => s.audio_url && (
          (s.album || "").toLowerCase() === lower ||
          (s.album && s.album.toLowerCase().includes(lower)) ||
          (s.title && s.title.toLowerCase().includes(lower))
        )
      );
    }

    const deduped = dedupeSongs(songs).sort((a, b) =>
      parseInt(b.year || 0, 10) - parseInt(a.year || 0, 10)
    );
    const sample = deduped[0] || {};

    res.json({
      name: sample.album || albumName,
      coverImage: sample.thumbnail_url || "",
      releaseYear: sample.year || "",
      artist: sample.artist || "",
      language: sample.language || "",
      songCount: deduped.length,
      songs: deduped,
    });
  } catch (err) {
    console.error("Error in getSongsByAlbum:", err.message);
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
