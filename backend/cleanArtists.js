/**
 * cleanArtists.js
 * Cleans up dirty / HTML-contaminated artist fields in songs.json.
 * Run with: node cleanArtists.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const songsPath = path.join(__dirname, "data", "songs.json");
const songs = JSON.parse(fs.readFileSync(songsPath, "utf8"));

function cleanArtist(raw) {
  if (!raw) return "Various Artists";

  // Strip HTML tags
  let cleaned = raw.replace(/<[^>]*>/g, " ");

  // Collapse excessive whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // If it's clearly just a list of names (short, no HTML markers), keep as-is
  // If it's still very long, try extracting the part after "Singer(s)" label
  if (cleaned.length > 200) {
    // Try to find "Singer(s)" keyword and extract text after it
    const singerMatch = cleaned.match(/Singer\(s\)\s*(.+)/i);
    if (singerMatch) {
      cleaned = singerMatch[1].trim();
    }

    // Cut at the first occurrence of known noise markers
    const noiseKeywords = [
      "Last Updated", "Release On", "Share On", "Album", "Listen",
      "Facebook", "00:00", "Audio Music Online", "Download",
    ];
    for (const kw of noiseKeywords) {
      const idx = cleaned.indexOf(kw);
      if (idx > 0) {
        cleaned = cleaned.substring(0, idx).trim();
      }
    }
  }

  // Remove trailing commas/dashes
  cleaned = cleaned.replace(/[,\-–—]+$/, "").trim();

  // If still too long, truncate at last comma before 150 chars
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 150).replace(/,?[^,]*$/, "").trim();
  }

  return cleaned || "Various Artists";
}

let cleaned = 0;
const updated = songs.map((song) => {
  const orig = song.artist || "";
  const fix = cleanArtist(orig);
  if (fix !== orig) {
    cleaned++;
    return { ...song, artist: fix };
  }
  return song;
});

fs.writeFileSync(songsPath, JSON.stringify(updated, null, 2), "utf8");
console.log(`Done! Cleaned artist field on ${cleaned} / ${songs.length} songs.`);
