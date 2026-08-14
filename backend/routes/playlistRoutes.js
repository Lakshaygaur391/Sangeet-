import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json([]);
});

router.post("/", (req, res) => {
  const { name = "New Playlist", description = "", isPublic = true } = req.body;
  const newPlaylist = {
    _id: Date.now().toString(),
    name,
    description,
    isPublic,
    songs: [],
    createdAt: new Date().toISOString(),
  };
  res.status(201).json(newPlaylist);
});

router.get("/:id", (req, res) => {
  res.json({
    _id: req.params.id,
    name: "Playlist",
    description: "",
    songs: [],
  });
});

router.patch("/:id", (req, res) => {
  res.json({ _id: req.params.id, ...req.body });
});

router.delete("/:id", (req, res) => {
  res.json({ success: true });
});

router.post("/:id/songs", (req, res) => {
  res.json({ success: true, songId: req.body.songId });
});

router.delete("/:id/songs/:songId", (req, res) => {
  res.json({ success: true });
});

export default router;
