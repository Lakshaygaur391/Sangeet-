import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import Song from "./models/Song.js";

dotenv.config();

const normalizeText = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .trim();

const normalizeSongRecord = (song = {}) => {
  const title = normalizeText(song.title || song.name || "Unknown Song");
  const artist = normalizeText(song.artist || song.singer || "Unknown Artist");
  const language = normalizeText(song.language || "Unknown");

  return {
    ...song,
    title,
    artist,
    language,
  };
};

const dedupeSongs = (songs = []) => {
  const seen = new Map();

  for (const song of songs) {
    const normalized = normalizeSongRecord(song);
    const title = normalized.title.toLowerCase();
    const artist = normalized.artist.toLowerCase();
    const language = normalized.language.toLowerCase();

    if (!title || !artist) continue;

    const key = `${title}::${artist}::${language}`;
    if (!seen.has(key)) {
      seen.set(key, normalized);
      continue;
    }

    const existing = seen.get(key);
    seen.set(key, {
      ...existing,
      ...normalized,
      image: existing.image || normalized.image,
      youtube_url: existing.youtube_url || normalized.youtube_url || "",
      thumbnail_url: existing.thumbnail_url || normalized.thumbnail_url || "",
    });
  }

  return Array.from(seen.values());
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const rawData = fs.readFileSync("./data/songs.json", "utf8");
    const songs = JSON.parse(rawData);

    if (!Array.isArray(songs)) {
      throw new Error("❌ songs.json should be an array of songs!");
    }

    const cleanedSongs = dedupeSongs(songs);

    await Song.deleteMany();
    await Song.insertMany(cleanedSongs);

    console.log(`✅ ${cleanedSongs.length} unique songs imported successfully!`);
    process.exit();
  })
  .catch((err) => {
    console.error("❌ Error importing songs:", err);
    process.exit(1);
  });
