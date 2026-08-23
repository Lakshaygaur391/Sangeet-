import express from "express";
import {
  getYearlyPlaylistsOverview,
  getYearlyPlaylistByYear,
  getAllUserPlaylists,
  createUserPlaylist,
  getUserPlaylistById,
  updateUserPlaylist,
  deleteUserPlaylist,
  addSongToUserPlaylist,
  removeSongFromUserPlaylist,
  reorderUserPlaylist,
} from "../controllers/playlistController.js";

const router = express.Router();

// Smart Yearly Playlists endpoints (must come before /:id)
router.get("/years", getYearlyPlaylistsOverview);
router.get("/year/:year", getYearlyPlaylistByYear);

// User Playlists CRUD
router.get("/", getAllUserPlaylists);
router.post("/", createUserPlaylist);
router.get("/:id", getUserPlaylistById);
router.patch("/:id", updateUserPlaylist);
router.put("/:id", updateUserPlaylist);
router.delete("/:id", deleteUserPlaylist);

// Playlist Song Management
router.post("/:id/songs", addSongToUserPlaylist);
router.delete("/:id/songs/:songId", removeSongFromUserPlaylist);
router.put("/:id/reorder", reorderUserPlaylist);

export default router;
