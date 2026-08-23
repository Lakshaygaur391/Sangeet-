import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  language: { type: String, required: true },
  album: { type: String, default: "" },
  year: { type: String, default: "" },
  audio_url: { type: String, default: "" },
  youtube_url: { type: String, default: "" },
  thumbnail_url: { type: String, default: "" },
});

export const inferYear = (song = {}) => {
  const explicit = String(song.year || song.release_year || song.releaseYear || "").trim();
  if (explicit && explicit !== "") return explicit;

  const thumb = String(song.thumbnail_url || "");
  const title = String(song.title || song.name || "");
  const audio = String(song.audio_url || "");

  const thumbMatch = thumb.match(/\b(20[0-2]\d|19\d{2})\b/);
  if (thumbMatch) return thumbMatch[1];

  const titleMatch = title.match(/\b(20[0-2]\d|19\d{2})\b/);
  if (titleMatch) return titleMatch[1];

  const audioMatch = audio.match(/\/(?:320-download|128-downloads)\/(\d+)/);
  if (audioMatch) {
    const n = parseInt(audioMatch[1], 10);
    if (n >= 54000) return "2026";
    if (n >= 50000) return "2025";
    if (n >= 40000) return "2024";
    if (n >= 30000) return "2023";
    if (n >= 20000) return "2022";
    if (n >= 10000) return "2010s";
    return "Retro";
  }

  return "2026";
};

export const inferAlbum = (song = {}) => {
  const explicit = String(song.album || "").trim();
  if (explicit && explicit !== "" && explicit.toLowerCase() !== "single") {
    return explicit;
  }

  const thumb = String(song.thumbnail_url || "");
  const title = String(song.title || song.name || "");

  if (thumb) {
    const m = thumb.match(/\/coverimages\/(?:album\/)?([^/]+?)(?:-500-500)?(?:\.jpg|\.png|\.webp)$/i);
    if (m && m[1]) {
      const slug = m[1].replace(/-\d+-\d+$/, "").replace(/-(20[0-2]\d|19\d{2})$/, "");
      const tokens = slug.split("-");
      const titleTokens = title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

      let tIdx = 0;
      const remainder = [];
      for (const tok of tokens) {
        if (tIdx < titleTokens.length && tok.toLowerCase() === titleTokens[tIdx]) {
          tIdx++;
        } else {
          remainder.push(tok);
        }
      }

      if (remainder.length > 0 && remainder.length <= 6) {
        let albumCandidate = remainder
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        albumCandidate = albumCandidate
          .replace(/\s*(?:Mp3\s*Songs?|Songs?|Mp3|Download|Audio)\s*$/i, "")
          .replace(/\s*\(\d{4}\)\s*$/, "")
          .trim();

        if (
          albumCandidate &&
          albumCandidate.length >= 2 &&
          !["mp3", "song", "songs", "download", "audio", "track"].includes(albumCandidate.toLowerCase())
        ) {
          return albumCandidate;
        }
      }
    }
  }

  return "Single";
};

songSchema.pre("save", function (next) {
  if (!this.year || this.year.trim() === "") {
    this.year = inferYear(this);
  }
  if (!this.album || this.album.trim() === "") {
    this.album = inferAlbum(this);
  }
  next();
});

songSchema.pre("insertMany", function (next, docs) {
  if (Array.isArray(docs)) {
    for (const doc of docs) {
      if (!doc.year || String(doc.year).trim() === "") {
        doc.year = inferYear(doc);
      }
      if (!doc.album || String(doc.album).trim() === "") {
        doc.album = inferAlbum(doc);
      }
    }
  }
  next();
});

export default mongoose.model("Song", songSchema);
