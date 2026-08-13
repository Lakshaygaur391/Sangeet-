import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import songRoutes from "./routes/songRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("API is running"));

app.use("/api/auth", authRoutes);
app.use("/api", songRoutes);

// Connect to MongoDB (cached across invocations to avoid reconnecting every request)
let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log("MongoDB connected");
}

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ error: "DB connection failed" });
    }
});

export default app;