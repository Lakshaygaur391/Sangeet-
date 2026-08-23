import mongoose from "mongoose";
import dotenv from "dotenv";
import Song from "./models/Song.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.Mongo_URI);
  const total = await Song.countDocuments();
  const resolved = await Song.countDocuments({ youtube_url: { $ne: "" } });
  const withAlbum = await Song.countDocuments({ album: { $nin: ["", null, "Single"] } });
  const withYear = await Song.countDocuments({ year: { $nin: ["", null] } });
  const sample = await Song.findOne({ album: { $nin: ["", null, "Single"] } }).lean();
  console.log({ total, resolved, withAlbum, withYear, sample });
  process.exit(0);
}

check();
