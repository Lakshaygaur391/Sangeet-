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
      let totalPagesForCat = 1;
      let categorySongCount = 0;

      while (page <= totalPagesForCat) {
        const startTime = Date.now();
        process.stdout.write(`  ↳ [${cat.name}] Page ${page}${totalPagesForCat > 1 ? `/${totalPagesForCat}` : ""}... `);

        try {
          const res = await scrapeCategoryPage(cat.key, page);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          if (res.success) {
            if (res.maxPages && res.maxPages > totalPagesForCat) {
              totalPagesForCat = res.maxPages;
            }

            const count = res.songs ? res.songs.length : 0;
            categorySongCount += res.newCount || count;
            console.log(`✅ ${elapsed}s | Extracted: ${count} songs | New: ${res.newCount || count} | Max Pages: ${totalPagesForCat}`);

            // Stop if there are no more pages available on PagalWorld
            if (!res.hasMore && page >= totalPagesForCat) {
              console.log(`  🏁 Reached last page for ${cat.name}.`);
              break;
            }
          } else {
            console.log(`⚠️ HTTP/Fetch notice (${res.message}) in ${elapsed}s`);
          }
        } catch (err) {
          console.log(`❌ Error on page ${page}: ${err.message}`);
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
