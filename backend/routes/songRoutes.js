import express from "express";
import {
  getAllSongs,
  getSongsByLanguage,
  getArtists,
  resolveSong,
  searchYoutube,
  scrapeCategorySongs,
  searchSongs,
} from "../controllers/songController.js";

const router = express.Router();

router.get("/songs", getAllSongs);
router.get("/search", searchSongs);
router.get("/songs/search", searchSongs);
router.get("/songs/language/:language", getSongsByLanguage);
router.get("/artists", getArtists);
router.get("/resolve-song", resolveSong);
router.get("/search-youtube", searchYoutube);
router.get("/scrape/category/:category", scrapeCategorySongs);
router.post("/scrape/category", scrapeCategorySongs);

export default router;

