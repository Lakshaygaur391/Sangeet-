// Shared helpers for working with songs, audio URLs, YouTube ids, thumbnails, and time formatting.
// Centralized here to ensure consistent playback metadata across the application.

export const DEFAULT_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231f1f23'/%3E%3Cstop offset='100%25' stop-color='%230f0f12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%232a2a30'/%3E%3Cpath d='M190 170v60l50-30z' fill='%23f59e0b'/%3E%3C/svg%3E";

export function getVideoId(url) {
  if (!url) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return (
    url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1] || null
  );
}

export function songId(song) {
  const s = song?._doc || song || {};
  return String(s._id || s.id || `${s.title}-${s.artist}`);
}

export function normalizeSong(song) {
  const plainSong = song?._doc || song || {};
  const audioUrl = (plainSong.audio_url || plainSong.audioUrl || plainSong.url || "").trim();
  const youtubeUrl = (plainSong.youtube_url || plainSong.videoUrl || "").trim();
  const videoId = getVideoId(youtubeUrl);
  const thumbnailUrl = (
    plainSong.thumbnail_url ||
    plainSong.image ||
    (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : DEFAULT_THUMBNAIL)
  ).trim();

  return {
    ...plainSong,
    _id: plainSong._id || plainSong.id,
    id: plainSong.id || plainSong._id,
    title: String(plainSong.title || plainSong.name || "Unknown Song").trim(),
    artist: String(plainSong.artist || plainSong.singer || "Unknown Artist").trim(),
    language: plainSong.language || "",
    audio_url: audioUrl,
    youtube_url: youtubeUrl,
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

export function avatarFor(name, bg = "random") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=${bg}`;
}
