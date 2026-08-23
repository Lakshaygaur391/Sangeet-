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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use("/audio", express.static(path.join(__dirname, "audio")));

// Disable buffering so queries fail immediately to fallback rather than timing out after 10s
mongoose.set("bufferCommands", false);

// Connect to MongoDB helper (cached across serverless invocations)
let isConnected = false;
async function connectDB() {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  const uri = process.env.MONGO_URI || process.env.Mongo_URI;
  if (!uri) {
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    isConnected = true;
  } catch (err) {
    console.warn("⚠️ MongoDB connection unavailable, running in local dataset mode:", err.message);
  }
}

// Database middleware for serverless/local environments
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    // Non-blocking
  }
  next();
});

app.get("/", (req, res) => res.send("API is running"));

app.use("/api/auth", authRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api", songRoutes);

export default app;