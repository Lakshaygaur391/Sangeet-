import mongoose from "mongoose";
import dotenv from "dotenv";
import Song from "./models/Song.js";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const total = await Song.countDocuments();
  const resolved = await Song.countDocuments({ youtube_url: { $ne: "" } });
  console.log(`Total songs in DB: ${total}, Resolved with youtube_url & thumbnail: ${resolved}`);
  process.exit(0);
}

check();
