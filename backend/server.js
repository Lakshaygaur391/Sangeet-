import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config(); // fallback

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.Mongo_URI;

if (!MONGO_URI) {
  console.warn("⚠️ Warning: MONGO_URI is not defined in environment variables.");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));
}

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
