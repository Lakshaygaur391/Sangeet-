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
const SONG_FIELDS = "title artist album year language audio_url thumbnail_url youtube_url";

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
 * Returns all dynamically available release years with song counts and collage artwork via DB aggregation.
 */
export const getYearlyPlaylistsOverview = async (req, res) => {
  try {
    const now = Date.now();
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

    if (cachedYearlyOverview && now - yearlyOverviewTimestamp < YEARLY_OVERVIEW_TTL) {
      return res.json(cachedYearlyOverview);
    }

    let result = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const yearGroups = await Song.aggregate([
          {
            $match: {
              audio_url: { $exists: true, $ne: "" },
              year: { $exists: true, $regex: /^[12][0-9]{3}$/ },
            },
          },
          {
            $group: {
              _id: "$year",
              songCount: { $sum: 1 },
              thumbnails: {
                $push: {
                  $cond: [
                    { $and: [{ $ne: ["$thumbnail_url", ""] }, { $ne: ["$thumbnail_url", null] }] },
                    "$thumbnail_url",
                    "$$REMOVE",
                  ],
                },
              },
            },
          },
          { $sort: { _id: -1 } },
        ]);

        result = yearGroups.map((g) => {
          const year = parseInt(g._id, 10);
          const rawThumbs = Array.isArray(g.thumbnails) ? g.thumbnails : [];
          const uniqueThumbs = Array.from(new Set(rawThumbs)).slice(0, 4);

          return {
            id: `year-${year}`,
            year,
            name: `${year}`,
            title: `${year}`,
            description: `Music released in ${year}`,
            owner: "Sangeet",
            isYearly: true,
            songCount: g.songCount,
            totalDuration: g.songCount * 210,
            collage: uniqueThumbs,
            coverImage: uniqueThumbs[0] || "",
            createdAt: `${year}-01-01T00:00:00.000Z`,
          };
        });
      } catch (dbErr) {
        console.warn("MongoDB aggregate in getYearlyPlaylistsOverview failed:", dbErr.message);
      }
    }

    if (!result || result.length === 0) {
      // Fallback years if DB unavailable
      const currentYear = new Date().getFullYear();
      result = Array.from({ length: 10 }, (_, i) => {
        const y = currentYear - i;
        return {
          id: `year-${y}`,
          year: y,
          name: `${y}`,
          title: `${y}`,
          description: `Music released in ${y}`,
          owner: "Sangeet",
          isYearly: true,
          songCount: 50,
          totalDuration: 50 * 210,
          collage: [],
          coverImage: "",
          createdAt: `${y}-01-01T00:00:00.000Z`,
        };
      });
    }

    cachedYearlyOverview = result;
    yearlyOverviewTimestamp = now;

    return res.json(result);
  } catch (err) {
    console.error("Error in getYearlyPlaylistsOverview:", err);
    res.status(500).json({ message: "Failed to generate yearly playlists" });
  }
};

/**
 * GET /api/playlists/year/:year
 * Returns full smart playlist for a specific year using targeted DB query.
 */
export const getYearlyPlaylistByYear = async (req, res) => {
  try {
    const rawYear = String(req.params.year || "").replace(/^year-/, "");
    const targetYear = parseInt(rawYear, 10);
    if (isNaN(targetYear)) {
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    let yearSongs = [];

    if (mongoose.connection.readyState === 1) {
      try {
        yearSongs = await Song.find({
          audio_url: { $exists: true, $ne: "" },
          year: String(targetYear),
        })
          .select(SONG_FIELDS)
          .sort({ _id: -1 })
          .limit(100)
          .lean();
      } catch (dbErr) {
        console.warn("MongoDB query failed in getYearlyPlaylistByYear:", dbErr.message);
      }
    }

    const deduped = dedupeSongs(yearSongs);
    const totalDuration = deduped.reduce((acc, s) => acc + (s.duration || 210), 0);
    const collage = [];
    const seenThumb = new Set();
    for (const s of deduped) {
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
      songCount: deduped.length,
      totalDuration,
      collage,
      coverImage: collage[0] || "",
      songs: deduped,
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
  const rawKey = String(typeOrLang || "").toLowerCase().replace(/^(curated-|spotlight-|category-)/, "");

  let name = "";
  let description = "";
  let songs = [];

  const matchQuery = { audio_url: { $exists: true, $ne: "" } };
  let sortQuery = { year: -1 };

  if (rawKey === "fresh" || rawKey === "new-releases") {
    name = "Fresh on Sangeet";
    description = "The freshest drops and newly released songs, handpicked for you.";
    sortQuery = { year: -1, _id: -1 };
  } else if (rawKey === "trending" || rawKey === "trending-in-india") {
    name = "Trending in India";
    description = "The hottest, most played tracks setting the charts on fire across India right now.";
    sortQuery = { _id: -1 };
  } else if (rawKey === "instagram-viral-song" || rawKey === "viral") {
    name = "Instagram Viral Song Spotlight";
    description = "The most viral and trending sounds dominating social feeds and reels.";
    matchQuery.language = { $regex: /instagram|viral/i };
  } else {
    // Language spotlight
    const capLang = rawKey ? rawKey.charAt(0).toUpperCase() + rawKey.slice(1) : "Popular";
    name = `${capLang} Spotlight`;
    description = `The best and latest ${capLang} songs and chart-toppers curated by Sangeet.`;
    matchQuery.language = new RegExp(`^${rawKey}$`, "i");
  }

  if (mongoose.connection.readyState === 1) {
    try {
      songs = await Song.find(matchQuery)
        .select(SONG_FIELDS)
        .sort(sortQuery)
        .limit(60)
        .lean();
    } catch (e) {
      console.warn("Curated playlist query failed:", e.message);
    }
  }

  const deduped = dedupeSongs(songs);
  const totalDuration = deduped.reduce((acc, s) => acc + (s.duration || 210), 0);
  const collage = [];
  const seenThumb = new Set();
  for (const s of deduped) {
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
    songCount: deduped.length,
    totalDuration,
    collage,
    coverImage: collage[0] || "",
    songs: deduped,
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
        dbPlaylists = await Playlist.find({}).sort({ updatedAt: -1 }).limit(100).lean();
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
    if (!songToAdd && songId && mongoose.connection.readyState === 1 && mongoose.isValidObjectId(songId)) {
      try {
        songToAdd = await Song.findById(songId).select(SONG_FIELDS).lean();
      } catch (e) {
        // fallback
      }
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
