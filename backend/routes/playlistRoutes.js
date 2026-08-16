import express from "express";
import {
  getAllPlaylists,
  createPlaylist,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderPlaylist,
} from "../controllers/playlistController.js";

const router = express.Router();

router.get("/", getAllPlaylists);
router.post("/", createPlaylist);
router.get("/:id", getPlaylistById);
router.patch("/:id", updatePlaylist);
router.delete("/:id", deletePlaylist);
router.post("/:id/songs", addSongToPlaylist);
router.delete("/:id/songs/:songId", removeSongFromPlaylist);
router.patch("/:id/reorder", reorderPlaylist);

export default router;
