import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Song from "../models/Song.js";
import { dedupeSongs, normalizeSongRecord } from "./songController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYLISTS_FILE = path.join(__dirname, "../data/playlists.json");

// Helper to extract verified release year from any song record
export const extractReleaseYear = (song) => {
  if (!song) return null;

  // 1. Direct explicit properties if provided
  if (song.release_year) {
    const y = parseInt(song.release_year, 10);
    if (!isNaN(y) && y >= 1950 && y <= 2099) return y;
  }
  if (song.releaseYear) {
    const y = parseInt(song.releaseYear, 10);
    if (!isNaN(y) && y >= 1950 && y <= 2099) return y;
  }
  if (song.year) {
    const y = parseInt(song.year, 10);
    if (!isNaN(y) && y >= 1950 && y <= 2099) return y;
  }
  if (song.releaseDate) {
    const y = new Date(song.releaseDate).getFullYear();
    if (!isNaN(y) && y >= 1950 && y <= 2099) return y;
  }

  const thumb = String(song.thumbnail_url || "");
  const audio = String(song.audio_url || "");
  const title = String(song.title || "");
  const album = String(song.album || "");

  // 2. Pattern in thumbnail filename (e.g. -Hindi-2026-, -2016-, _2024_)
  const filenamePattern = /[-_](?:[A-Za-z]+[-_])?(20[0-9]{2})[-_]/;
  const matchThumb = thumb.match(filenamePattern);
  if (matchThumb) {
    const y = parseInt(matchThumb[1], 10);
    if (y >= 1990 && y <= 2099) return y;
  }

  // 3. Pattern in title: (2026) or [2026]
  const titleYear = title.match(/[\(\[\s](20[0-9]{2})[\)\]\s]/);
  if (titleYear) {
    const y = parseInt(titleYear[1], 10);
    if (y >= 1990 && y <= 2099) return y;
  }

  // 4. Pattern in album: (2026)
  const albumYear = album.match(/(20[0-9]{2})/);
  if (albumYear) {
    const y = parseInt(albumYear[1], 10);
    if (y >= 1990 && y <= 2099) return y;
  }

  // 5. Pattern in upload folder: /uploads/2026/
  const uploadMatch = (thumb + " " + audio).match(/\/uploads\/(20[0-9]{2})\//);
  if (uploadMatch) {
    const y = parseInt(uploadMatch[1], 10);
    if (y >= 1990 && y <= 2099) return y;
  }

  // 6. Generic 4-digit 20xx in url
  const anyUrlYear = (thumb + " " + audio).match(/(20[0-9]{2})/);
  if (anyUrlYear) {
    const y = parseInt(anyUrlYear[1], 10);
    if (y >= 1990 && y <= 2099) return y;
  }

  return new Date().getFullYear();
};

// Helper to load songs catalog
const getAllCatalogSongs = async () => {
  let allSongs = [];
  if (mongoose.connection.readyState === 1) {
    try {
      allSongs = await Song.find({ audio_url: { $exists: true, $ne: "" } }).lean();
    } catch (err) {
      console.warn("DB query in playlistController failed, using local songs.json fallback:", err.message);
    }
  }

  if (!allSongs || allSongs.length === 0) {
    try {
      const songsPath = path.join(__dirname, "../data/songs.json");
      if (fs.existsSync(songsPath)) {
        allSongs = JSON.parse(fs.readFileSync(songsPath, "utf8"));
      }
    } catch (e) {
      allSongs = [];
    }
  }

  return dedupeSongs(allSongs.filter((s) => s.audio_url && s.audio_url.trim() !== ""));
};

// Local storage for user playlists
const getLocalPlaylists = () => {
  try {
    if (fs.existsSync(PLAYLISTS_FILE)) {
      const raw = fs.readFileSync(PLAYLISTS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading local playlists.json:", err.message);
  }
  return [];
};

const saveLocalPlaylists = (list) => {
  try {
    const dir = path.dirname(PLAYLISTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving local playlists.json:", err.message);
  }
};

/**
 * GET /api/playlists/years
 * Returns all dynamically available release years with song counts, total duration, and collage artwork.
 */
export const getYearlyPlaylistsOverview = async (req, res) => {
  try {
    const songs = await getAllCatalogSongs();
    const yearBuckets = new Map();

    for (const song of songs) {
      const year = extractReleaseYear(song);
      if (!year) continue;

      if (!yearBuckets.has(year)) {
        yearBuckets.set(year, []);
      }
      yearBuckets.get(year).push(song);
    }

    // Sort newest year first
    const sortedYears = Array.from(yearBuckets.keys()).sort((a, b) => b - a);

    const result = sortedYears.map((year) => {
      const yearSongs = yearBuckets.get(year);
      const songCount = yearSongs.length;
      
      // Calculate total duration (assume ~210s per song if not provided)
      const totalDuration = yearSongs.reduce((acc, s) => acc + (s.duration || 210), 0);

      // Collect 4 unique thumbnails for collage
      const collage = [];
      const seenThumb = new Set();
      for (const s of yearSongs) {
        if (s.thumbnail_url && !seenThumb.has(s.thumbnail_url)) {
          seenThumb.add(s.thumbnail_url);
          collage.push(s.thumbnail_url);
          if (collage.length === 4) break;
        }
      }

      return {
        id: `year-${year}`,
        year,
        name: `${year}`,
        title: `${year}`,
        description: `Music released in ${year}`,
        owner: "Sangeet",
        isYearly: true,
        songCount,
        totalDuration,
        collage,
        coverImage: collage[0] || "",
        createdAt: `${year}-01-01T00:00:00.000Z`,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error in getYearlyPlaylistsOverview:", err);
    res.status(500).json({ message: "Failed to generate yearly playlists" });
  }
};

/**
 * GET /api/playlists/year/:year
 * Returns full smart playlist for a specific year.
 */
export const getYearlyPlaylistByYear = async (req, res) => {
  try {
    const targetYear = parseInt(req.params.year.replace(/^year-/, ""), 10);
    if (isNaN(targetYear)) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    const allSongs = await getAllCatalogSongs();
    const yearSongs = allSongs.filter((song) => extractReleaseYear(song) === targetYear);

    // Compute duration and collage
    const totalDuration = yearSongs.reduce((acc, s) => acc + (s.duration || 210), 0);
    const collage = [];
    const seenThumb = new Set();
    for (const s of yearSongs) {
      if (s.thumbnail_url && !seenThumb.has(s.thumbnail_url)) {
        seenThumb.add(s.thumbnail_url);
        collage.push(s.thumbnail_url);
        if (collage.length === 4) break;
      }
    }

    const playlist = {
      id: `year-${targetYear}`,
      _id: `year-${targetYear}`,
      year: targetYear,
      name: `${targetYear}`,
      title: `${targetYear}`,
      description: `The best songs and releases from ${targetYear}. Automatically updated with all ${targetYear} tracks.`,
      owner: "Sangeet",
      isYearly: true,
      songCount: yearSongs.length,
      totalDuration,
      collage,
      coverImage: collage[0] || "",
      songs: yearSongs,
      createdAt: `${targetYear}-01-01T00:00:00.000Z`,
    };

    res.json(playlist);
  } catch (err) {
    console.error("Error in getYearlyPlaylistByYear:", err);
    res.status(500).json({ message: "Failed to fetch yearly playlist" });
  }
};

/**
 * Curated Spotlight / System Playlists
 */
export const getCuratedPlaylist = async (typeOrLang) => {
  const allSongs = await getAllCatalogSongs();
  const rawKey = typeOrLang.toLowerCase().replace(/^(curated-|spotlight-|category-)/, "");

  let name = "";
  let description = "";
  let songs = [];

  if (rawKey === "fresh" || rawKey === "new-releases") {
    name = "Fresh on Sangeet";
    description = "The freshest drops and newly released songs, handpicked for you.";
    songs = allSongs.slice(0, 100);
  } else if (rawKey === "trending" || rawKey === "trending-in-india") {
    name = "Trending in India";
    description = "The hottest, most played tracks setting the charts on fire across India right now.";
    songs = [...allSongs].reverse().slice(0, 100);
  } else if (rawKey === "instagram-viral-song" || rawKey === "viral") {
    name = "Instagram Viral Song Spotlight";
    description = "The most viral and trending sounds dominating social feeds and reels.";
    songs = allSongs.filter(
      (s) =>
        (s.language || "").toLowerCase().includes("instagram") ||
        (s.language || "").toLowerCase().includes("viral")
    );
    if (songs.length === 0) songs = allSongs.slice(0, 50);
  } else {
    // Language spotlight
    const capLang = rawKey.charAt(0).toUpperCase() + rawKey.slice(1);
    name = `${capLang} Spotlight`;
    description = `The best and latest ${capLang} songs and chart-toppers curated by Sangeet.`;
    songs = allSongs.filter((s) => (s.language || "").trim().toLowerCase() === rawKey);
  }

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 210), 0);
  const collage = [];
  const seenThumb = new Set();
  for (const s of songs) {
    if (s.thumbnail_url && !seenThumb.has(s.thumbnail_url)) {
      seenThumb.add(s.thumbnail_url);
      collage.push(s.thumbnail_url);
      if (collage.length === 4) break;
    }
  }

  return {
    id: `spotlight-${rawKey}`,
    _id: `spotlight-${rawKey}`,
    name,
    title: name,
    description,
    owner: "Sangeet Curated",
    isCurated: true,
    isYearly: false,
    songCount: songs.length,
    totalDuration,
    collage,
    coverImage: collage[0] || "",
    songs,
    createdAt: new Date().toISOString(),
  };
};

/**
 * User Playlists CRUD
 */
export const getAllUserPlaylists = async (req, res) => {
  try {
    const list = getLocalPlaylists();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createUserPlaylist = async (req, res) => {
  try {
    const { name = "New Playlist", description = "", isPublic = true, coverImage = "" } = req.body;
    const list = getLocalPlaylists();

    const newPlaylist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      _id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || "New Playlist",
      description: description.trim(),
      isPublic: Boolean(isPublic),
      coverImage: coverImage || "",
      songs: [],
      owner: "You",
      isYearly: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newPlaylist);
    saveLocalPlaylists(list);

    res.status(201).json(newPlaylist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserPlaylistById = async (req, res) => {
  try {
    const id = req.params.id;
    if (id.startsWith("year-") || /^\d{4}$/.test(id)) {
      req.params.year = id;
      return getYearlyPlaylistByYear(req, res);
    }

    if (
      id.startsWith("spotlight-") ||
      id.startsWith("curated-") ||
      id.startsWith("category-") ||
      id === "fresh" ||
      id === "trending"
    ) {
      const curated = await getCuratedPlaylist(id);
      return res.json(curated);
    }

    const list = getLocalPlaylists();
    const playlist = list.find((p) => (p.id || p._id) === id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUserPlaylist = async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const list = getLocalPlaylists();
    const idx = list.findIndex((p) => (p.id || p._id) === id);

    if (idx === -1) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveLocalPlaylists(list);
    res.json(list[idx]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUserPlaylist = async (req, res) => {
  try {
    const id = req.params.id;
    let list = getLocalPlaylists();
    list = list.filter((p) => (p.id || p._id) !== id);
    saveLocalPlaylists(list);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addSongToUserPlaylist = async (req, res) => {
  try {
    const id = req.params.id;
    const { songId, song } = req.body;
    const list = getLocalPlaylists();
    const playlist = list.find((p) => (p.id || p._id) === id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    let songToAdd = song;
    if (!songToAdd && songId) {
      const allSongs = await getAllCatalogSongs();
      songToAdd = allSongs.find((s) => (s._id || s.id || s.audio_url) === songId);
    }

    if (songToAdd) {
      const normalized = normalizeSongRecord(songToAdd);
      const exists = (playlist.songs || []).some(
        (s) => (s._id || s.id || s.audio_url) === (normalized._id || normalized.id || normalized.audio_url)
      );

      if (!exists) {
        playlist.songs = playlist.songs || [];
        playlist.songs.push(normalized);
        playlist.updatedAt = new Date().toISOString();
        saveLocalPlaylists(list);
      }
    }

    res.json({ success: true, playlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeSongFromUserPlaylist = async (req, res) => {
  try {
    const { id, songId } = req.params;
    const list = getLocalPlaylists();
    const playlist = list.find((p) => (p.id || p._id) === id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    playlist.songs = (playlist.songs || []).filter(
      (s) => (s._id || s.id || s.audio_url) !== songId
    );
    playlist.updatedAt = new Date().toISOString();
    saveLocalPlaylists(list);

    res.json({ success: true, playlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const reorderUserPlaylist = async (req, res) => {
  try {
    const id = req.params.id;
    const { songs } = req.body;
    const list = getLocalPlaylists();
    const playlist = list.find((p) => (p.id || p._id) === id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (Array.isArray(songs)) {
      playlist.songs = songs;
      playlist.updatedAt = new Date().toISOString();
      saveLocalPlaylists(list);
    }

    res.json({ success: true, playlist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
