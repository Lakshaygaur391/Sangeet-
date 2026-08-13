import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import Song from "../models/Song.js";
import { resolveYouTubeUrl } from "../controllers/songController.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for full song thumbnail & YouTube URL resolution...");

  const songs = await Song.find({});
  console.log(`Found ${songs.length} total songs in database.`);

  const unresolved = songs.filter((s) => !s.youtube_url || !s.thumbnail_url);
  console.log(`Unresolved songs remaining: ${unresolved.length}`);

  const batchSize = 8;
  let resolvedCount = 0;

  for (let i = 0; i < unresolved.length; i += batchSize) {
    const chunk = unresolved.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (song) => {
        try {
          const res = await resolveYouTubeUrl(song.title, song.artist);
          if (res && res.youtube_url) {
            resolvedCount++;
            await Song.updateOne(
              { _id: song._id },
              {
                youtube_url: res.youtube_url,
                thumbnail_url: res.thumbnail_url,
              }
            );
          }
        } catch (err) {
          console.error(`Error resolving "${song.title}":`, err.message);
        }
      })
    );
    console.log(`[Progress: ${Math.min(i + batchSize, unresolved.length)}/${unresolved.length}] Resolved ${resolvedCount} new songs...`);
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("MongoDB update complete! Syncing resolved details to backend/data/songs.json...");

  const updatedDbSongs = await Song.find({}).lean();
  const songsJsonPath = "./data/songs.json";

  if (fs.existsSync(songsJsonPath)) {
    const rawData = fs.readFileSync(songsJsonPath, "utf8");
    const jsonSongs = JSON.parse(rawData);

    const mergedJsonSongs = jsonSongs.map((jsSong) => {
      const match = updatedDbSongs.find(
        (dbS) =>
          dbS.title.toLowerCase().trim() === (jsSong.title || jsSong.name || "").toLowerCase().trim() &&
          dbS.artist.toLowerCase().trim() === (jsSong.artist || jsSong.singer || "").toLowerCase().trim()
      );
      if (match && match.youtube_url) {
        return {
          ...jsSong,
          youtube_url: match.youtube_url,
          thumbnail_url: match.thumbnail_url,
        };
      }
      return jsSong;
    });

    fs.writeFileSync(songsJsonPath, JSON.stringify(mergedJsonSongs, null, 2), "utf8");
    console.log("✅ backend/data/songs.json has been updated with pre-resolved YouTube thumbnails!");
  }

  console.log("All done!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Resolution error:", err);
  process.exit(1);
});
