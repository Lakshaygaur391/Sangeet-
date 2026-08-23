/**
 * enrich_album_year.js
 *
 * Fills in missing `album` and `year` fields for existing songs in MongoDB.
 *
 * HOW IT WORKS:
 *  1. Fetches all DB songs where album="" or year="" from MongoDB.
 *  2. For each song, searches PagalWorld.is by title+artist.
 *  3. Visits the first matching song page and extracts album & year.
 *  4. Bulk-updates MongoDB.
 *
 * SAFE TO STOP & RESTART:
 *  Only processes songs that still have empty album/year fields.
 *  So you can ctrl+c and re-run anytime -- it picks up where it left off.
 *
 * RUN:
 *   cd backend
 *   node scripts/enrich_album_year.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import Song from "../models/Song.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.Mongo_URI;
const BASE_URL = "https://pagalworld.is";
const CONCURRENCY = 10;
const SAVE_EVERY = 200;

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 30,
  keepAliveMsecs: 60000,
});

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function sanitize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

async function findSongPageUrl(title, artist) {
  const query = encodeURIComponent(`${title} ${artist.split(",")[0].trim()}`);
  const searchUrl = `${BASE_URL}/?s=${query}`;
  try {
    const res = await axios.get(searchUrl, { headers: HEADERS, httpsAgent, timeout: 7000 });
    if (res.status !== 200 || !res.data) return null;
    const $ = cheerio.load(res.data);
    let songUrl = null;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("/song/") && href.includes("-mp3-download") && !songUrl) {
        songUrl = new URL(href, BASE_URL).toString();
      }
    });
    return songUrl;
  } catch {
    return null;
  }
}

async function scrapeAlbumYear(songPageUrl) {
  try {
    const res = await axios.get(songPageUrl, { headers: HEADERS, httpsAgent, timeout: 7000 });
    if (res.status !== 200 || !res.data) return { album: "", year: "" };
    const $ = cheerio.load(res.data);
    const mainContent = $(".main-content").length ? $(".main-content") : $("body");
    let album = "";
    let year = "";

    mainContent.find("tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 2) {
        const label = sanitize($(cells[0]).text());
        const value = sanitize($(cells[1]).text());
        if (!album && /^Album$/i.test(label) && value && value.length < 200) album = value;
        if (!year && /^Year|^Release\s*Year/i.test(label) && value) {
          const m = value.match(/(\d{4})/);
          if (m) year = m[1];
        }
      }
    });

    if (!album || !year) {
      mainContent.find("li, p, div, span").each((_, el) => {
        const raw = $(el).clone().find("*").remove().end().text();
        const cleaned = sanitize(raw);
        if (!album) {
          const m = cleaned.match(/^Album\s*[:\-]?\s*(.+)$/i);
          if (m && m[1] && m[1].length < 200) album = m[1].trim();
        }
        if (!year) {
          const m = cleaned.match(/^(?:Year|Release\s*Year)\s*[:\-]?\s*(\d{4})/i);
          if (m) year = m[1];
        }
      });
    }

    if (!year) {
      const dataYear = $("[data-year]").first().attr("data-year");
      if (dataYear && /^\d{4}$/.test(dataYear.trim())) year = dataYear.trim();
    }

    if (!year) {
      const metaDesc = $("meta[name='description']").attr("content") || "";
      const m = metaDesc.match(/(\d{4})/);
      if (m) year = m[1];
    }

    return { album: sanitize(album), year: sanitize(year) };
  } catch {
    return { album: "", year: "" };
  }
}

async function processBatch(songs) {
  const results = await Promise.allSettled(
    songs.map(async (song) => {
      const songUrl = await findSongPageUrl(song.title, song.artist);
      if (!songUrl) return { id: song._id, album: "", year: "" };
      await new Promise((r) => setTimeout(r, 200));
      const { album, year } = await scrapeAlbumYear(songUrl);
      return { id: song._id, album, year };
    })
  );
  return results.filter((r) => r.status === "fulfilled").map((r) => r.value);
}

async function flushToMongo(updates) {
  if (updates.length === 0) return 0;
  const bulkOps = updates
    .filter((u) => u.album || u.year)
    .map((u) => ({
      updateOne: {
        filter: { _id: u.id },
        update: { $set: { album: u.album, year: u.year } },
      },
    }));
  if (bulkOps.length > 0) await Song.bulkWrite(bulkOps, { ordered: false });
  return bulkOps.length;
}

async function run() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is missing from backend/.env");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const totalMissing = await Song.countDocuments({
    $or: [{ album: { $in: ["", null] } }, { year: { $in: ["", null] } }],
  });
  console.log(`Songs missing album/year: ${totalMissing}`);

  if (totalMissing === 0) {
    console.log("All songs already have album and year data!");
    await mongoose.disconnect();
    process.exit(0);
  }

  let processed = 0;
  let enriched = 0;
  let batchBuffer = [];
  const FETCH_BATCH = 500;
  let skip = 0;

  console.log(`Starting enrichment (concurrency=${CONCURRENCY})...`);

  while (skip < totalMissing) {
    const songs = await Song.find(
      { $or: [{ album: { $in: ["", null] } }, { year: { $in: ["", null] } }] },
      { _id: 1, title: 1, artist: 1 }
    ).lean().skip(skip).limit(FETCH_BATCH);

    if (songs.length === 0) break;

    for (let i = 0; i < songs.length; i += CONCURRENCY) {
      const chunk = songs.slice(i, i + CONCURRENCY);
      const results = await processBatch(chunk);
      batchBuffer.push(...results);
      processed += chunk.length;

      const found = results.filter((r) => r.album || r.year).length;
      process.stdout.write(`\r  Processed: ${processed}/${totalMissing} | Enriched so far: ${enriched} | This chunk: ${found}/${chunk.length}`);

      if (batchBuffer.length >= SAVE_EVERY) {
        const written = await flushToMongo(batchBuffer);
        enriched += written;
        batchBuffer = [];
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    skip += FETCH_BATCH;
  }

  if (batchBuffer.length > 0) {
    const written = await flushToMongo(batchBuffer);
    enriched += written;
  }

  console.log(`\nDone!`);
  console.log(`Total processed: ${processed}`);
  console.log(`Records updated with album/year: ${enriched}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
