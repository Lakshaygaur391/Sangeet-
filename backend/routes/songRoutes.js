import express from "express";
import {
  getAllSongs,
  getSongsByLanguage,
  getArtists,
  resolveSong,
  searchYoutube,
} from "../controllers/songController.js";

const router = express.Router();

router.get("/songs", getAllSongs);
router.get("/songs/language/:language", getSongsByLanguage);
router.get("/artists", getArtists);
router.get("/resolve-song", resolveSong);
router.get("/search-youtube", searchYoutube);

export default router;
