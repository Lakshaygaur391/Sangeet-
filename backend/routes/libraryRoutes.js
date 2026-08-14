import express from "express";

const router = express.Router();

// Memory store fallback for liked/recent per user/session
const userLikes = new Map();
const userRecents = new Map();

router.get("/liked", (req, res) => {
  res.json([]);
});

router.post("/liked", (req, res) => {
  res.json({ success: true, songId: req.body.songId });
});

router.delete("/liked/:songId", (req, res) => {
  res.json({ success: true });
});

router.get("/recent", (req, res) => {
  res.json([]);
});

router.post("/recent", (req, res) => {
  res.json({ success: true, songId: req.body.songId });
});

router.delete("/recent", (req, res) => {
  res.json({ success: true });
});

export default router;
