import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  artist: { type: String, required: true, index: true },
  album: { type: String, default: "Single", index: true },
  year: { type: String, default: "", index: true },
  language: { type: String, required: true, index: true },
  audio_url: { type: String, default: "", index: true },
  youtube_url: { type: String, default: "" },
  thumbnail_url: { type: String, default: "" },
});

// Text index for fast multi-field keyword search
songSchema.index({ title: "text", artist: "text", album: "text", language: "text" });

// Compound indexes for fast filtered sorting and lookups
songSchema.index({ audio_url: 1, title: 1 });
songSchema.index({ audio_url: 1, artist: 1 });
songSchema.index({ audio_url: 1, language: 1 });
songSchema.index({ language: 1, year: -1 });

export default mongoose.model("Song", songSchema);

