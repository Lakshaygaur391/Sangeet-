import mongoose from "mongoose";
import dotenv from "dotenv";
import Song from "./models/Song.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const total = await Song.countDocuments();
  const languages = await Song.aggregate([
    { $group: { _id: "$language", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const samples = await Song.find().limit(5).lean();

  console.log(`\n========================================`);
  console.log(`Total songs in MongoDB: ${total}`);
  console.log(`Language Breakdown:`);
  languages.forEach(l => console.log(`  - ${l._id || 'Unknown'}: ${l.count} songs`));
  console.log(`\nSample Song Records:`);
  samples.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.language}] ${s.title} | ${s.artist}`);
    console.log(`     Audio: ${s.audio_url}`);
    console.log(`     Image: ${s.thumbnail_url}`);
  });
  console.log(`========================================\n`);
  process.exit(0);
}

check();

