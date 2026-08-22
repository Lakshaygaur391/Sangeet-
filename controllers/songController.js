import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import mongoose from "mongoose";
import Song from "../models/Song.js";
import { scrapeCategoryPage } from "../services/scraperService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const youtubeCache = new Map();
let cachedLocalSongs = null;

// Read and cache local JSON songs fallback
const getLocalSongs = () => {
  if (cachedLocalSongs && cachedLocalSongs.length > 0) {
    return cachedLocalSongs;
  }
  try {
    const filePath = path.join(__dirname, "../data/songs.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedLocalSongs = parsed;
        return cachedLocalSongs;
      }
    }
  } catch (err) {
    console.error("Failed to load local songs.json:", err.message);
  }
  return [];
};

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

export const getAllSongs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 0;

    let allSongs = [];

    // Query MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        allSongs = await Song.find({ audio_url: { $exists: true, $ne: "" } }).lean();
      } catch (dbErr) {
        console.warn("MongoDB query failed, using local dataset fallback:", dbErr.message);
      }
    }

    // Fallback to local dataset if DB is not connected or returned empty
    if (!allSongs || allSongs.length === 0) {
      allSongs = getLocalSongs().filter((s) => s.audio_url && s.audio_url.trim() !== "");
    }

    const normalizedSongs = dedupeSongs(allSongs);

    // If pagination params are provided, paginate; otherwise return full list
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
    console.error("Error in getAllSongs:", err.message);
    const local = dedupeSongs(getLocalSongs().filter((s) => s.audio_url));
    res.json(local);
  }
};

export const getSongsByLanguage = async (req, res) => {
  try {
    const language = (req.params.language || "").trim().toLowerCase();
    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 0;

    let allSongs = [];

    if (mongoose.connection.readyState === 1) {
      try {
        allSongs = await Song.find({
          language: new RegExp(`^${language}$`, "i"),
          audio_url: { $exists: true, $ne: "" },
        }).lean();
      } catch (dbErr) {
        console.warn("MongoDB language query failed, using local fallback:", dbErr.message);
      }
    }

    if (!allSongs || allSongs.length === 0) {
      allSongs = getLocalSongs().filter(
        (s) =>
          s.audio_url &&
          s.audio_url.trim() !== "" &&
          (s.language || "").trim().toLowerCase() === language
      );
    }

    const normalizedSongs = dedupeSongs(allSongs);

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
    console.error("Error in getSongsByLanguage:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const getArtists = async (req, res) => {
  try {
    let songs = [];

    if (mongoose.connection.readyState === 1) {
      try {
        songs = await Song.find({ audio_url: { $exists: true, $ne: "" } }).lean();
      } catch (dbErr) {
        console.warn("MongoDB getArtists query failed, using local fallback:", dbErr.message);
      }
    }

    if (!songs || songs.length === 0) {
      songs = getLocalSongs().filter((s) => s.audio_url && s.audio_url.trim() !== "");
    }

    const dedupedSongs = dedupeSongs(songs);
    const artistMap = new Map();

    dedupedSongs.forEach((song) => {
      const cleaned = normalizeSongRecord(song);
      const rawName = cleaned.artist;
      if (!rawName || rawName === "Unknown Artist") return;

      const normalizedName = rawName
        .replace(/\s+/g, " ")
        .trim();

      const artistKey = normalizedName.toLowerCase();
      if (!artistMap.has(artistKey)) {
        artistMap.set(artistKey, {
          id: normalizedName,
          name: normalizedName,
          image: cleaned.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedName)}&background=18181b&color=eab34a`,
          thumbnail_url: cleaned.thumbnail_url || "",
          songs: [],
          songKeys: new Set(),
        });
      }

      const artistEntry = artistMap.get(artistKey);
      if (!artistEntry.image && cleaned.thumbnail_url) {
        artistEntry.image = cleaned.thumbnail_url;
        artistEntry.thumbnail_url = cleaned.thumbnail_url;
      }

      const songKey = `${(cleaned.title || "").trim().toLowerCase()}::${(cleaned.artist || "").trim().toLowerCase()}::${(cleaned.language || "").trim().toLowerCase()}`;

      if (artistEntry.songKeys.has(songKey)) return;

      artistEntry.songKeys.add(songKey);
      artistEntry.songs.push(cleaned);
    });

    const artists = Array.from(artistMap.values()).map(({ songKeys, ...artist }) => {
      const topArtists = ["arijit singh", "diljit dosanjh", "badshah", "shreya ghoshal", "neha kakkar", "guru randhawa", "ap dhillon", "masoom sharma", "khasa aala chahar", "renuka panwar", "r nait", "sumit goswami", "sidhu moose wala", "karan aujla", "anuv jain", "prateek kuhad", "jubin nautiyal", "armaan malik", "atif aslam"];
      const isTop = topArtists.includes(artist.name.toLowerCase()) || artist.songs.length >= 3;
      return {
        ...artist,
        verified: isTop,
        songCount: artist.songs.length,
      };
    });
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

const searchCache = new Map();
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const searchSongs = async (req, res) => {
  try {
    const rawQuery = String(req.query.q || req.query.query || "").trim();
    const limit = parseInt(req.query.limit, 10) || 100;

    if (!rawQuery) {
      return res.json([]);
    }

    const cacheKey = `${rawQuery.toLowerCase()}::${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      return res.json(cached.data);
    }

    let matchedSongs = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const tokens = rawQuery
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

        const orConditions = [
          { title: new RegExp(rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { artist: new RegExp(rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { language: new RegExp(rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];

        if (tokens.length > 1) {
          tokens.forEach((tok) => {
            orConditions.push({ title: new RegExp(tok, "i") });
            orConditions.push({ artist: new RegExp(tok, "i") });
          });
        }

        matchedSongs = await Song.find({
          audio_url: { $exists: true, $ne: "" },
          $or: orConditions,
        })
          .limit(limit * 2)
          .lean();
      } catch (dbErr) {
        console.warn("MongoDB search query failed, using local fallback:", dbErr.message);
      }
    }

    if (!matchedSongs || matchedSongs.length === 0) {
      const q = rawQuery.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);

      matchedSongs = getLocalSongs().filter((s) => {
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
    }

    const deduped = dedupeSongs(matchedSongs);
    const qLower = rawQuery.toLowerCase();

    // Score & Rank results for maximum relevance
    const scored = deduped
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

        const lang = (s.language || "").toLowerCase();
        if (lang === qLower) score += 40;

        return { song: s, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.song)
      .slice(0, limit);

    // Cache the result
    if (searchCache.size > 200) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }
    searchCache.set(cacheKey, { timestamp: Date.now(), data: scored });

    res.json(scored);
  } catch (err) {
    console.error("Error in searchSongs:", err.message);
    res.status(500).json({ message: err.message });
  }
};

