import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import Song from "./models/Song.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

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
    audio_url: song.audio_url || "",
    youtube_url: song.youtube_url || "",
    thumbnail_url: song.thumbnail_url || "",
  };
};

const dedupeSongs = (songs = []) => {
  const seenAudio = new Set();
  const seenTitle = new Set();
  const result = [];

  for (const song of songs) {
    const normalized = normalizeSongRecord(song);
    const titleKey = normalized.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const artistKey = normalized.artist.split(/[,&]/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const audioKey = (normalized.audio_url || "").trim().toLowerCase();

    if (!titleKey) continue;

    if (audioKey) {
      if (seenAudio.has(audioKey)) continue;
      seenAudio.add(audioKey);
    }

    const comboKey = `${titleKey}::${artistKey}`;
    if (seenTitle.has(comboKey)) continue;
    seenTitle.add(comboKey);

    result.push(normalized);
  }

  return result;
};

const mongoUri = process.env.MONGO_URI || process.env.Mongo_URI;

if (!mongoUri) {
  console.error("❌ MONGO_URI is missing from backend/.env");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(async () => {
    const rawData = fs.readFileSync(path.join(__dirname, "data/songs.json"), "utf8");
    const songs = JSON.parse(rawData);

    if (!Array.isArray(songs)) {
      throw new Error("❌ songs.json should be an array of songs!");
    }

    const cleanedSongs = dedupeSongs(songs);

    console.log("🗑️ Deleting all previous data from MongoDB database...");
    const deleteResult = await Song.deleteMany({});
    console.log(`🗑️ Successfully deleted ${deleteResult.deletedCount} previous songs from the database.`);

    console.log(`📦 Inserting ${cleanedSongs.length} new songs from pagalnew.com...`);
    await Song.insertMany(cleanedSongs);

    console.log(`✅ ${cleanedSongs.length} unique songs imported successfully into MongoDB!`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error importing songs:", err);
    process.exit(1);
  });
