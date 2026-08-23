import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "sangeet_secret_key_2026";
const USERS_FILE = path.join(__dirname, "../data/users.json");

// Helper for local file-based user storage fallback
const getLocalUsers = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading local users.json:", err.message);
  }
  return [];
};

const saveLocalUsers = (users) => {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving local users.json:", err.message);
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please enter all required fields" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If MongoDB is connected, use Mongoose
    if (mongoose.connection.readyState === 1) {
      try {
        const userExists = await User.findOne({ email: cleanEmail });
        if (userExists) {
          return res.status(400).json({ message: "User with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
        });

        const token = generateToken(user._id);

        return res.status(201).json({
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        });
      } catch (dbErr) {
        console.warn("MongoDB registration failed, falling back to local storage:", dbErr.message);
      }
    }

    // Local file-based fallback
    const localUsers = getLocalUsers();
    const existing = localUsers.find((u) => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      _id: "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    localUsers.push(newUser);
    saveLocalUsers(localUsers);

    const token = generateToken(newUser._id);

    return res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Server error during registration" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If MongoDB is connected, try Mongoose first
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findOne({ email: cleanEmail });
        if (user) {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
          }

          const token = generateToken(user._id);

          return res.json({
            token,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
            },
          });
        }
      } catch (dbErr) {
        console.warn("MongoDB login failed, checking local users:", dbErr.message);
      }
    }

    // Local file-based fallback
    const localUsers = getLocalUsers();
    const user = localUsers.find((u) => u.email === cleanEmail);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
};

export const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          return res.json({
            id: user._id,
            name: user.name,
            email: user.email,
          });
        }
      } catch (dbErr) {
        // Fallback to local
      }
    }

    const localUsers = getLocalUsers();
    const localUser = localUsers.find((u) => u._id === decoded.id);
    if (!localUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: localUser._id,
      name: localUser.name,
      email: localUser.email,
    });
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
