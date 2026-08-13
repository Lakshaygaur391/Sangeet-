import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  language: { type: String, required: true },
  youtube_url: { type: String, default: "" },
  thumbnail_url: { type: String, default: "" },
});

export default mongoose.model("Song", songSchema);
