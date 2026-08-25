import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeCategoryPage } from "../services/scraperService.js";
import Song from "../models/Song.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.Mongo_URI;

// All supported categories on PagalWorld
const CATEGORIES = [
  { key: "punjabi", name: "Punjabi" },
  { key: "haryanvi", name: "Haryanvi" },
  { key: "bollywood", name: "Bollywood" },
  { key: "hindi", name: "Hindi" },
  { key: "indipop", name: "Indipop" },
  { key: "bhojpuri", name: "Bhojpuri" },
  { key: "tamil", name: "Tamil" },
  { key: "telugu", name: "Telugu" },
  { key: "marathi", name: "Marathi" },
  { key: "english", name: "English" },
  { key: "instagram-viral-song", name: "Instagram Viral" },
];

async function run() {
  console.log("=================================================================");
  console.log("🚀 FULL WEBSITE SCRAPER: ALL PAGES FOR EVERY CATEGORY");
  console.log("   (Stores direct 320kbps MP3 URLs in MongoDB & songs.json)");
  console.log("=================================================================");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const initialCount = await Song.countDocuments();
    console.log(`📊 Initial songs in Database: ${initialCount}\n`);

    for (const cat of CATEGORIES) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`▶ Starting Full Scrape for Category: [${cat.name.toUpperCase()}]`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      let page = 1;
      let totalPagesForCat = 999; // Will be refined by scraper; stops when empty pages hit
      let categorySongCount = 0;
      let consecutiveEmptyPages = 0;
      const MAX_CONSECUTIVE_EMPTY = 3; // Stop after 3 empty pages in a row

      while (page <= totalPagesForCat) {
        const startTime = Date.now();
        process.stdout.write(`  ↳ [${cat.name}] Page ${page}... `);

        try {
          const res = await scrapeCategoryPage(cat.key, page);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          if (res.success) {
            const count = res.songs ? res.songs.length : 0;
            const newCount = res.newCount || 0;
            categorySongCount += newCount;
            console.log(`✅ ${elapsed}s | Extracted: ${count} | New: ${newCount} | Page: ${page}/${totalPagesForCat < 999 ? totalPagesForCat : "?"}`);

            if (count === 0) {
              consecutiveEmptyPages++;
              if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY) {
                console.log(`  🏁 ${MAX_CONSECUTIVE_EMPTY} consecutive empty pages — reached end of [${cat.name}].`);
                break;
              }
            } else {
              consecutiveEmptyPages = 0; // Reset on any successful page
            }
          } else {
            console.log(`⚠️  HTTP/Fetch notice (${res.message}) in ${elapsed}s`);
            consecutiveEmptyPages++;
            if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY) {
              console.log(`  🏁 Too many errors — skipping rest of [${cat.name}].`);
              break;
            }
          }
        } catch (err) {
          console.log(`❌ Error on page ${page}: ${err.message}`);
          consecutiveEmptyPages++;
          if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY) break;
        }

        page++;
        // Short pause between page requests to avoid rate limits
        await new Promise((r) => setTimeout(r, 600));
      }

      console.log(`✨ Category [${cat.name}] completed. Total new songs added: ${categorySongCount}`);
    }

    const finalCount = await Song.countDocuments();
    console.log("\n=================================================================");
    console.log("🎉 ALL CATEGORIES AND ALL PAGES SCRAPED SUCCESSFULLY!");
    console.log(`📊 Total direct-MP3 songs in Database: ${finalCount} (+${finalCount - initialCount} added)`);
    console.log("=================================================================\n");
  } catch (err) {
    console.error("Fatal Error during full scrape:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
    process.exit(0);
  }
}

run();
