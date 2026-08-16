import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import songRoutes from "./routes/songRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import libraryRoutes from "./routes/libraryRoutes.js";
import playlistRoutes from "./routes/playlistRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config(); // fallback

const app = express();

app.use(cors());
app.use(express.json());
app.use("/audio", express.static(path.join(__dirname, "audio")));

// Connect to MongoDB helper (cached across serverless invocations)
let isConnected = false;
async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  const uri = process.env.MONGO_URI || process.env.Mongo_URI;
  if (!uri) {
    console.warn("⚠️ MONGO_URI is not defined");
    return;
  }
  await mongoose.connect(uri);
  isConnected = true;
}

// Database middleware for serverless/local environments
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err.message);
    next();
  }
});

app.get("/", (req, res) => res.send("API is running"));

app.use("/api/auth", authRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api", songRoutes);

export default app;