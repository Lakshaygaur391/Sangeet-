# Sangeet — Music Streaming Platform

Sangeet is a modern music streaming web application with a high-performance React (Vite + Tailwind) frontend and a Node.js/Express REST API backend connected to MongoDB.

---

## 📁 Project Structure

```text
miniproject/
├── backend/                  # Express REST API
│   ├── controllers/          # Business logic (auth, songs, search, playlists)
│   ├── models/               # Mongoose schemas (User, Song)
│   ├── routes/               # Express API endpoints
│   ├── scripts/              # Data resolution & seed scripts
│   ├── data/                 # Static JSON datasets (songs.json)
│   ├── audio/                # Local audio files storage
│   ├── app.js                # Express app & middleware configuration
│   ├── server.js             # Server startup & DB connection
│   ├── .env.example          # Backend environment variables template
│   └── package.json
│
├── frontend/                 # React 19 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # UI & layout components (Player, Navbar, Modals)
│   │   ├── context/          # React Context providers (Auth, Player, Library, UI)
│   │   ├── hooks/            # Custom React hooks (useMediaSession, etc.)
│   │   ├── pages/            # View pages (Home, Discover, Search, Library, Playlist, Artist)
│   │   ├── services/         # API client & HTTP service functions
│   │   └── lib/              # Utility helpers
│   ├── index.html            # Main HTML document
│   ├── vite.config.js        # Vite configuration
│   ├── .env.example          # Frontend environment variables template
│   └── package.json
│
├── scrap.py                  # Web scraping utility
├── .gitignore                # Root gitignore
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
npm install
# Copy .env.example to .env and configure your MONGO_URI
npm run dev    # Starts server with nodemon at http://localhost:5000
# or
npm start      # Starts server with node
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev    # Starts Vite dev server at http://localhost:5173
```

---

## 🛠️ API & Features

- **Authentication**: JWT-based user login, registration, and persistent sessions.
- **Music Player**: YouTube-backed audio player with queue management, seek bar, and media controls.
- **Personal Library**: Liked songs, custom user playlists, recently played tracks.
- **Search & Discover**: Multi-language categorization, artist exploration, real-time search.
