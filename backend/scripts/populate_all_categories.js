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

// All supported categories
const CATEGORIES = [
  { key: "punjabi",               name: "Punjabi" },
  { key: "haryanvi",              name: "Haryanvi" },
  { key: "bollywood",             name: "Bollywood" },
  { key: "hindi",                 name: "Hindi" },
  { key: "indipop",               name: "Indipop" },
  { key: "bhojpuri",              name: "Bhojpuri" },
  { key: "tamil",                 name: "Tamil" },
  { key: "telugu",                name: "Telugu" },
  { key: "marathi",               name: "Marathi" },
  { key: "english",               name: "English" },
  { key: "instagram-viral-song",  name: "Instagram Viral" },
];

// Years to scrape per category (newest first for priority)
// PagalWorld uses ?release_year=YYYY to filter per year — each has its own paginated listing
const YEARS = [];
for (let y = 2026; y >= 1990; y--) YEARS.push(y);
// Also scrape the unfiltered listing (catches songs with no year tag)
YEARS.push(null);

const MAX_CONSECUTIVE_EMPTY = 5; // Stop a year's pages after 5 empty in a row

async function scrapeYearPages(catKey, catName, year) {
  const label = year ? `[${catName}] year=${year}` : `[${catName}] (unfiltered)`;
  let page = 1;
  let totalPages = 9999;
  let yearNewCount = 0;
  let consecutiveEmpty = 0;

  while (page <= totalPages) {
    const startTime = Date.now();
    process.stdout.write(`    ↳ ${label} Page ${page}... `);

    try {
      const res = await scrapeCategoryPage(catKey, page, year);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (res.success) {
        const count = res.songs ? res.songs.length : 0;
        const newCount = res.newCount || 0;
        yearNewCount += newCount;

        // Update real page count if detected from site pagination
        if (res.maxPages && res.maxPages < 9000 && res.maxPages > page) {
          totalPages = res.maxPages;
        }

        console.log(`✅ ${elapsed}s | Extracted: ${count} | New: ${newCount} | Page: ${page}/${totalPages < 9999 ? totalPages : "?"}`);

        if (count === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
            console.log(`    🏁 ${MAX_CONSECUTIVE_EMPTY} empty pages — done with ${label}.`);
            break;
          }
        } else {
          consecutiveEmpty = 0;
        }
      } else {
        console.log(`⚠️  ${res.message}`);
        consecutiveEmpty++;
        if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) break;
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      consecutiveEmpty++;
      if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) break;
    }

    page++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return yearNewCount;
}

async function run() {
  console.log("=================================================================");
  console.log("🚀 FULL SCRAPER: ALL CATEGORIES × ALL YEARS");
  console.log("   Scrapes each category filtered by each year (1990–2026)");
  console.log("   then unfiltered to catch songs with no year tag.");
  console.log("   Duplicates are skipped automatically via audio_url dedup.");
  console.log("=================================================================");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const initialCount = await Song.countDocuments();
    console.log(`📊 Initial songs in Database: ${initialCount}\n`);

    for (const cat of CATEGORIES) {
      console.log(`\n${"━".repeat(65)}`);
      console.log(`▶ Category: [${cat.name.toUpperCase()}] — scraping ${YEARS.length} year slices`);
      console.log("━".repeat(65));

      let catTotal = 0;

      for (const year of YEARS) {
        const yearNew = await scrapeYearPages(cat.key, cat.name, year);
        catTotal += yearNew;
        if (yearNew > 0) {
          console.log(`  ✨ ${year ?? "unfiltered"}: +${yearNew} new songs`);
        }
      }

      console.log(`\n✅ [${cat.name}] done. Total new songs added: ${catTotal}`);
    }

    const finalCount = await Song.countDocuments();
    console.log("\n=================================================================");
    console.log("🎉 ALL CATEGORIES × ALL YEARS SCRAPED!");
    console.log(`📊 Final DB count: ${finalCount} (+${finalCount - initialCount} added)`);
    console.log("=================================================================\n");
  } catch (err) {
    console.error("Fatal Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
    process.exit(0);
  }
}

run();
