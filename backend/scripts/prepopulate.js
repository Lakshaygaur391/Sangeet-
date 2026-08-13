import mongoose from "mongoose";
import dotenv from "dotenv";
import Song from "../models/Song.js";
import { resolveYouTubeUrl } from "../controllers/songController.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for pre-population...");

  const songs = await Song.find({ $or: [{ youtube_url: "" }, { youtube_url: { $exists: false } }] }).limit(50);
  console.log(`Found ${songs.length} unresolved songs to process...`);

  let count = 0;
  for (const song of songs) {
    try {
      const res = await resolveYouTubeUrl(song.title, song.artist);
      if (res) {
        count++;
        console.log(`[${count}/${songs.length}] Resolved: ${song.title} - ${song.artist}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (e) {
      console.error(`Error resolving ${song.title}:`, e.message);
    }
  }

  console.log(`Pre-population finished! Resolved ${count} songs.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
