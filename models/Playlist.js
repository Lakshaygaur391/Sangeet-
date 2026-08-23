import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    coverImage: { type: String, default: "" },
    isPublic: { type: Boolean, default: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    songs: { type: Array, default: [] },
  },
  { timestamps: true }
);

// Prevent overwrite model compilation error
export default mongoose.models.Playlist || mongoose.model("Playlist", playlistSchema);
