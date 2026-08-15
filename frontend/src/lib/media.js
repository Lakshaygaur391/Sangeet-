// Shared helpers for working with songs, audio URLs, thumbnails, and time formatting.
// Centralized here to ensure consistent playback metadata across the application.

export const DEFAULT_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231f1f23'/%3E%3Cstop offset='100%25' stop-color='%230f0f12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%232a2a30'/%3E%3Cpath d='M190 170v60l50-30z' fill='%23f59e0b'/%3E%3C/svg%3E";

export function songId(song) {
  const s = song?._doc || song || {};
  return String(s._id || s.id || `${s.title}-${s.artist}`);
}

export function normalizeSong(song) {
  const plainSong = song?._doc || song || {};
  const audioUrl = (plainSong.audio_url || plainSong.audioUrl || plainSong.url || "").trim();
  const thumbnailUrl = (
    plainSong.thumbnail_url ||
    plainSong.image ||
    DEFAULT_THUMBNAIL
  ).trim();

  return {
    ...plainSong,
    _id: plainSong._id || plainSong.id,
    id: plainSong.id || plainSong._id,
    title: String(plainSong.title || plainSong.name || "Unknown Song").trim(),
    artist: String(plainSong.artist || plainSong.singer || "Unknown Artist").trim(),
    language: plainSong.language || "",
    audio_url: audioUrl,
    thumbnail_url: thumbnailUrl,
  };
}

export function formatTime(time) {
  if (!time || Number.isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function scoreSongMatch(song, query) {
  const title = (song.title || "").toLowerCase();
  const artist = (song.artist || "").toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  if (title === q) score += 100;
  if (artist === q) score += 80;
  if (title.startsWith(q)) score += 30;
  if (artist.startsWith(q)) score += 25;
  if (title.includes(q)) score += 20;
  if (artist.includes(q)) score += 15;
  return score;
}

const KNOWN_ARTIST_IMAGES = {
  "arijit singh": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
  "diljit dosanjh": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
  "badshah": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
  "shreya ghoshal": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80",
  "neha kakkar": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
  "guru randhawa": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
  "ap dhillon": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80",
  "sidhu moose wala": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
  "karan aujla": "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=500&auto=format&fit=crop&q=80",
  "yo yo honey singh": "https://images.unsplash.com/photo-1520523839898-5071282543e2?w=500&auto=format&fit=crop&q=80",
  "masoom sharma": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
  "khasa aala chahar": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80",
  "renuka panwar": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
  "r nait": "https://images.unsplash.com/photo-1571266028243-d220c6a7a2d0?w=500&auto=format&fit=crop&q=80",
  "sumit goswami": "https://images.unsplash.com/photo-1598387993441-a364f854ceba?w=500&auto=format&fit=crop&q=80",
  "pritam": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
  "b praak": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
  "vishal mishra": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
};

export function getArtistImage(name = "", fallbackThumbnail = "") {
  const cleanName = String(name || "").trim().toLowerCase();
  if (KNOWN_ARTIST_IMAGES[cleanName]) {
    return KNOWN_ARTIST_IMAGES[cleanName];
  }
  // Check if any partial known artist name matches
  for (const [key, url] of Object.entries(KNOWN_ARTIST_IMAGES)) {
    if (cleanName.includes(key)) {
      return url;
    }
  }
  if (fallbackThumbnail && !fallbackThumbnail.includes("ui-avatars.com")) {
    return fallbackThumbnail;
  }
  return avatarFor(name, "1c1c1e&color=eab34a");
}

export function avatarFor(name, bg = "random") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=${bg}`;
}

