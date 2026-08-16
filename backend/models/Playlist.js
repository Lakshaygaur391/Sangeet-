import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    songs: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Playlist", playlistSchema);
