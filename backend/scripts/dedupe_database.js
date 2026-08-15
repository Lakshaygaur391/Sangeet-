import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Song from "../models/Song.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.Mongo_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing from backend/.env");
  process.exit(1);
}

function normalizeKey(str = "") {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

async function dedupe() {
  console.log("=================================================");
  console.log("🧹 MONGODB DUPLICATE REMOVER & CLEANER");
  console.log("=================================================");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas\n");

    const allSongs = await Song.find({}).lean();
    console.log(`📊 Total songs before deduplication: ${allSongs.length}`);

    const seenAudio = new Map();
    const seenTitleArtist = new Map();
    const duplicateIds = [];

    for (const song of allSongs) {
      const audioKey = (song.audio_url || "").trim().toLowerCase();
      const titleKey = normalizeKey(song.title);
      const firstArtist = (song.artist || "").split(/[,&]/)[0];
      const artistKey = normalizeKey(firstArtist);
      const comboKey = titleKey && artistKey ? `${titleKey}::${artistKey}` : null;

      let isDuplicate = false;

      // 1. Check if same audio URL exists
      if (audioKey) {
        if (seenAudio.has(audioKey)) {
          isDuplicate = true;
        } else {
          seenAudio.set(audioKey, song._id);
        }
      }

      // 2. Check if same title + artist combo exists
      if (comboKey) {
        if (seenTitleArtist.has(comboKey)) {
          isDuplicate = true;
        } else {
          seenTitleArtist.set(comboKey, song._id);
        }
      }

      if (isDuplicate) {
        duplicateIds.push(song._id);
      }
    }

    console.log(`🔍 Found ${duplicateIds.length} duplicate song entries.`);

    if (duplicateIds.length > 0) {
      const deleteResult = await Song.deleteMany({ _id: { $in: duplicateIds } });
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} duplicate entries from MongoDB.`);
    } else {
      console.log("✨ No duplicates found! Database is completely clean.");
    }

    // Optional: create unique index on audio_url so duplicates are blocked permanently
    try {
      await Song.collection.createIndex({ audio_url: 1 }, { unique: true, sparse: true });
      console.log("🔒 Unique index ensured on 'audio_url' to prevent future duplicates.");
    } catch (e) {
      // ignore if index already exists
    }

    const remainingCount = await Song.countDocuments();
    console.log(`\n📊 Total clean unique songs in MongoDB: ${remainingCount}`);
    console.log("=================================================\n");
  } catch (err) {
    console.error("❌ Error during deduplication:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
    process.exit(0);
  }
}

dedupe();
