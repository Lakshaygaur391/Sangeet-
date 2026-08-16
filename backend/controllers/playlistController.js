import jwt from "jsonwebtoken";
import Playlist from "../models/Playlist.js";
import Song from "../models/Song.js";

const JWT_SECRET = process.env.JWT_SECRET || "sangeet_secret_key_2026";

function getUserIdFromReq(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.id || null;
  } catch {
    return null;
  }
}

export const getAllPlaylists = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const filter = userId ? { $or: [{ user: userId }, { isPublic: true }] } : { isPublic: true };
    const playlists = await Playlist.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createPlaylist = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const { name, description = "", coverImage = "", isPublic = false, songs = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description.trim(),
      coverImage: coverImage.trim(),
      isPublic: Boolean(isPublic),
      user: userId || null,
      songs,
    });

    res.status(201).json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPlaylistById = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id).lean();
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePlaylist = async (req, res) => {
  try {
    const { name, description, coverImage, isPublic } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (coverImage !== undefined) updates.coverImage = coverImage.trim();
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const playlist = await Playlist.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addSongToPlaylist = async (req, res) => {
  try {
    const { songId, song } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    // Look up song if object not provided
    let songDoc = song;
    if (!songDoc && songId) {
      songDoc = await Song.findById(songId).lean();
    }
    if (!songDoc && songId) {
      songDoc = { id: songId, _id: songId };
    }

    if (songDoc) {
      const exists = playlist.songs.some((s) => String(s._id || s.id) === String(songDoc._id || songDoc.id));
      if (!exists) {
        playlist.songs.push(songDoc);
        await playlist.save();
      }
    }

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeSongFromPlaylist = async (req, res) => {
  try {
    const { songId } = req.params;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    playlist.songs = playlist.songs.filter((s) => String(s._id || s.id) !== String(songId));
    await playlist.save();

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const reorderPlaylist = async (req, res) => {
  try {
    const { songIds } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    if (Array.isArray(songIds)) {
      const songMap = new Map(playlist.songs.map((s) => [String(s._id || s.id), s]));
      const newSongs = songIds.map((id) => songMap.get(String(id))).filter(Boolean);
      playlist.songs = newSongs;
      await playlist.save();
    }

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
