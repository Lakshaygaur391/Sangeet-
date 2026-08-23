import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Song from "../models/Song.js";
import Playlist from "../models/Playlist.js";
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
export const getAllCatalogSongs = async () => {
  let allSongs = [];
  if (mongoose.connection.readyState === 1) {
    try {
      allSongs = await Song.find({ audio_url: { $exists: true, $ne: "" } }).lean();
    } catch (err) {
      console.warn("DB query in playlistController failed, using local songs.json fallback:", err.message);
    }
  }

  if (!allSongs || allSongs.length === 0) {
    const possiblePaths = [
      path.join(__dirname, "../data/songs.json"),
      path.join(process.cwd(), "backend/data/songs.json"),
      path.join(process.cwd(), "data/songs.json"),
      path.join(process.cwd(), "../backend/data/songs.json"),
    ];
    for (const songsPath of possiblePaths) {
      try {
        if (fs.existsSync(songsPath)) {
          allSongs = JSON.parse(fs.readFileSync(songsPath, "utf8"));
          if (Array.isArray(allSongs) && allSongs.length > 0) break;
        }
      } catch (e) {
        allSongs = [];
      }
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

let cachedYearlyOverview = null;
let yearlyOverviewTimestamp = 0;
const YEARLY_OVERVIEW_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/playlists/years
 * Returns all dynamically available release years with song counts, total duration, and collage artwork.
 */
export const getYearlyPlaylistsOverview = async (req, res) => {
  try {
    const now = Date.now();
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

    if (cachedYearlyOverview && now - yearlyOverviewTimestamp < YEARLY_OVERVIEW_TTL) {
      return res.json(cachedYearlyOverview);
    }

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

    cachedYearlyOverview = result;
    yearlyOverviewTimestamp = now;

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
    const rawYear = String(req.params.year || "").replace(/^year-/, "");
    const targetYear = parseInt(rawYear, 10);
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
  const rawKey = String(typeOrLang || "").toLowerCase().replace(/^(curated-|spotlight-|category-)/, "");

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
    const capLang = rawKey ? rawKey.charAt(0).toUpperCase() + rawKey.slice(1) : "Popular";
    name = `${capLang} Spotlight`;
    description = `The best and latest ${capLang} songs and chart-toppers curated by Sangeet.`;
    songs = allSongs.filter((s) => (s.language || "").trim().toLowerCase() === rawKey);
    if (songs.length === 0) {
      // Fallback: search in title or artist or general songs if exact language filter has no match
      songs = allSongs.slice(0, 50);
    }
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
    id: `spotlight-${rawKey || "featured"}`,
    _id: `spotlight-${rawKey || "featured"}`,
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
    let dbPlaylists = [];
    if (mongoose.connection.readyState === 1) {
      try {
        dbPlaylists = await Playlist.find({}).sort({ updatedAt: -1 }).lean();
      } catch (e) {
        // Fallback to local
      }
    }

    const localList = getLocalPlaylists();
    const seen = new Set();
    const combined = [];

    [...dbPlaylists, ...localList].forEach((p) => {
      const key = String(p._id || p.id || "");
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push(p);
      }
    });

    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createUserPlaylist = async (req, res) => {
  try {
    const { name = "New Playlist", description = "", isPublic = true, coverImage = "" } = req.body;
    const localList = getLocalPlaylists();

    const newPlaylist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    newPlaylist._id = newPlaylist.id;

    if (mongoose.connection.readyState === 1) {
      try {
        const saved = await Playlist.create({
          name: newPlaylist.name,
          description: newPlaylist.description,
          coverImage: newPlaylist.coverImage,
          isPublic: newPlaylist.isPublic,
          songs: [],
        });
        if (saved) {
          newPlaylist._id = String(saved._id);
          newPlaylist.id = String(saved._id);
        }
      } catch (e) {
        console.warn("Could not save playlist to MongoDB, using local fallback:", e.message);
      }
    }

    localList.unshift(newPlaylist);
    saveLocalPlaylists(localList);

    res.status(201).json(newPlaylist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserPlaylistById = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

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

    // Try MongoDB query if valid ObjectId
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id)) {
      try {
        const dbPlaylist = await Playlist.findById(id).lean();
        if (dbPlaylist) return res.json(dbPlaylist);
      } catch (dbErr) {
        // Fallback to local
      }
    }

    // Check local playlists
    const list = getLocalPlaylists();
    const playlist = list.find((p) => String(p.id || p._id) === id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json(playlist);
  } catch (err) {
    console.error("Error in getUserPlaylistById:", err.message);
    res.status(500).json({ message: err.message });
  }
};

export const updateUserPlaylist = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const updates = req.body;
    const list = getLocalPlaylists();
    const idx = list.findIndex((p) => String(p.id || p._id) === id);

    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id)) {
      try {
        await Playlist.findByIdAndUpdate(id, { $set: updates }, { new: true });
      } catch (e) {
        // Ignore fallback
      }
    }

    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveLocalPlaylists(list);
      return res.json(list[idx]);
    }

    res.status(404).json({ message: "Playlist not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUserPlaylist = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id)) {
      try {
        await Playlist.findByIdAndDelete(id);
      } catch (e) {
        // Ignore fallback
      }
    }

    let list = getLocalPlaylists();
    list = list.filter((p) => String(p.id || p._id) !== id);
    saveLocalPlaylists(list);
    res.json({ success: true, message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addSongToUserPlaylist = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const { songId, song } = req.body;
    const list = getLocalPlaylists();
    const playlist = list.find((p) => String(p.id || p._id) === id);

    let songToAdd = song;
    if (!songToAdd && songId) {
      const allSongs = await getAllCatalogSongs();
      songToAdd = allSongs.find((s) => (s._id || s.id || s.audio_url) === songId);
    }

    if (songToAdd) {
      const normalized = normalizeSongRecord(songToAdd);
      if (playlist) {
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

      if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id)) {
        try {
          const dbPl = await Playlist.findById(id);
          if (dbPl) {
            const exists = (dbPl.songs || []).some(
              (s) => (s._id || s.id || s.audio_url) === (normalized._id || normalized.id || normalized.audio_url)
            );
            if (!exists) {
              dbPl.songs.push(normalized);
              await dbPl.save();
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    res.json({ success: true, playlist: playlist || { id, songs: [] } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeSongFromUserPlaylist = async (req, res) => {
  try {
    const { id, songId } = req.params;
    const list = getLocalPlaylists();
    const playlist = list.find((p) => String(p.id || p._id) === String(id));

    if (playlist) {
      playlist.songs = (playlist.songs || []).filter(
        (s) => (s._id || s.id || s.audio_url) !== songId
      );
      playlist.updatedAt = new Date().toISOString();
      saveLocalPlaylists(list);
    }

    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id)) {
      try {
        const dbPl = await Playlist.findById(id);
        if (dbPl) {
          dbPl.songs = (dbPl.songs || []).filter((s) => (s._id || s.id || s.audio_url) !== songId);
          await dbPl.save();
        }
      } catch (e) {
        // Ignore
      }
    }

    res.json({ success: true, playlist: playlist || { id, songs: [] } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const reorderUserPlaylist = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const { songs, songIds } = req.body;
    const list = getLocalPlaylists();
    const playlist = list.find((p) => String(p.id || p._id) === id);

    let reorderedSongs = null;
    if (Array.isArray(songs)) {
      reorderedSongs = songs;
    } else if (Array.isArray(songIds) && playlist && Array.isArray(playlist.songs)) {
      const songMap = new Map(playlist.songs.map((s) => [String(s._id || s.id || s.audio_url), s]));
      reorderedSongs = songIds.map((sid) => songMap.get(String(sid))).filter(Boolean);
    }

    if (playlist && reorderedSongs) {
      playlist.songs = reorderedSongs;
      playlist.updatedAt = new Date().toISOString();
      saveLocalPlaylists(list);
    }

    if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(id) && reorderedSongs) {
      try {
        const dbPl = await Playlist.findById(id);
        if (dbPl) {
          dbPl.songs = reorderedSongs;
          await dbPl.save();
        }
      } catch (e) {
        // Ignore
      }
    }

    res.json({ success: true, playlist: playlist || { id, songs: reorderedSongs || [] } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
