import axios from "axios";
import Song from "../models/Song.js";

const youtubeCache = new Map();

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
  const seen = new Map();

  for (const song of songs) {
    const normalized = normalizeSongRecord(song);
    const title = normalizeSongString(normalized.title || "").toLowerCase();
    const artist = normalizeSongString(normalized.artist || "").toLowerCase();
    const language = normalizeSongString(normalized.language || "").toLowerCase();

    if (!title || !artist) continue;

    const key = `${title}::${artist}::${language}`;
    if (!seen.has(key)) {
      seen.set(key, normalized);
      continue;
    }

    const existing = seen.get(key);
    const next = {
      ...existing,
      ...normalized,
    };

    if (!existing.image && normalized.image) next.image = normalized.image;
    if (!existing.audio_url && normalized.audio_url) next.audio_url = normalized.audio_url;
    if (!existing.youtube_url && normalized.youtube_url) next.youtube_url = normalized.youtube_url;
    if (!existing.thumbnail_url && normalized.thumbnail_url) next.thumbnail_url = normalized.thumbnail_url;

    seen.set(key, next);
  }

  return Array.from(seen.values());
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

export const getAllSongs = async (req, res) => {
  try {
    // Only return songs that have a direct MP3 audio_url so the player always works
    const songs = await Song.find({ audio_url: { $exists: true, $ne: "" } }).lean();
    const normalizedSongs = dedupeSongs(songs);
    res.json(normalizedSongs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSongsByLanguage = async (req, res) => {
  try {
    const language = req.params.language;
    // Only return songs that have a direct MP3 audio_url
    const songs = await Song.find({ language, audio_url: { $exists: true, $ne: "" } }).lean();
    const normalizedSongs = dedupeSongs(songs);
    res.json(normalizedSongs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getArtists = async (req, res) => {
  try {
    // Only build artist cards from songs that have a playable audio_url
    const songs = await Song.find({ audio_url: { $exists: true, $ne: "" } }).lean();
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
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedName)}&background=random`,
          songs: [],
          songKeys: new Set(),
        });
      }

      const artistEntry = artistMap.get(artistKey);
      const songKey = `${(cleaned.title || "").trim().toLowerCase()}::${(cleaned.artist || "").trim().toLowerCase()}::${(cleaned.language || "").trim().toLowerCase()}`;

      if (artistEntry.songKeys.has(songKey)) return;

      artistEntry.songKeys.add(songKey);
      artistEntry.songs.push(cleaned);
    });

    const artists = Array.from(artistMap.values()).map(({ songKeys, ...artist }) => artist);
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

