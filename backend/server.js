// Sangeet API server — includes /api/scrape/category/:category route
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

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
