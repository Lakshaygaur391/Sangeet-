import { useEffect } from "react";

// Wires the browser's Media Session API to our player. Two jobs:
//  1. Shows lock-screen / notification-shade controls with title, artist,
//     and artwork on mobile, and hardware-key controls on desktop.
//  2. Registering a session at all is what tells Chrome/Android this tab
//     is "playing media" rather than an idle background tab — that's the
//     signal browsers use to decide whether to keep audio alive when the
//     tab isn't visible, so this isn't just cosmetic.
export default function useMediaSession({ currentSong, isPlaying, setIsPlaying, playNext, playPrevious, seekTo, duration, currentTime }) {
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: "Sangeet",
      artwork: currentSong.thumbnail_url
        ? [
            { src: currentSong.thumbnail_url, sizes: "96x96", type: "image/jpeg" },
            { src: currentSong.thumbnail_url, sizes: "256x256", type: "image/jpeg" },
            { src: currentSong.thumbnail_url, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });
  }, [currentSong]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    const safeSet = (action, handler) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* action not supported on this browser — ignore */
      }
    };

    safeSet("play", () => setIsPlaying(true));
    safeSet("pause", () => setIsPlaying(false));
    safeSet("previoustrack", () => playPrevious());
    safeSet("nexttrack", () => playNext());
    safeSet("seekto", (details) => {
      if (details.seekTime != null) seekTo(details.seekTime);
    });

    return () => {
      ["play", "pause", "previoustrack", "nexttrack", "seekto"].forEach((action) => safeSet(action, null));
    };
  }, [setIsPlaying, playPrevious, playNext, seekTo]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !("setPositionState" in navigator.mediaSession)) return;
    if (!duration || Number.isNaN(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime || 0, duration),
      });
    } catch {
      /* position state not accepted (e.g. seek in progress) — ignore */
    }
  }, [currentTime, duration]);
}
