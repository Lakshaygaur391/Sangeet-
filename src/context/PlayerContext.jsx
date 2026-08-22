import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { normalizeSong, songId } from "../lib/media";

const PlayerContext = createContext();

export const REPEAT_MODES = ["off", "all", "one"];

const STORAGE_KEYS = {
  CURRENT_SONG: "sangeet_player_current_song",
  QUEUE: "sangeet_player_queue",
  INDEX: "sangeet_player_index",
  TIME: "sangeet_player_time",
  DURATION: "sangeet_player_duration",
  VOLUME: "sangeet_player_volume",
  SHUFFLE: "sangeet_player_shuffle",
  REPEAT: "sangeet_player_repeat",
};

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    // Ignore storage quota errors
  }
}

export const PlayerProvider = ({ children }) => {
  // Restore persistent player state from localStorage so refreshing the page preserves playback
  const [currentSong, setCurrentSong] = useState(() => {
    const song = loadStorage(STORAGE_KEYS.CURRENT_SONG, null);
    return song ? normalizeSong(song) : null;
  });

  const [songList, setSongList] = useState(() => {
    const list = loadStorage(STORAGE_KEYS.QUEUE, []);
    return Array.isArray(list) ? list.map(normalizeSong) : [];
  });

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = loadStorage(STORAGE_KEYS.INDEX, 0);
    return typeof idx === "number" && idx >= 0 ? idx : 0;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(() => loadStorage(STORAGE_KEYS.SHUFFLE, false));
  const [repeatMode, setRepeatMode] = useState(() => loadStorage(STORAGE_KEYS.REPEAT, "off"));
  const [volume, setVolume] = useState(() => loadStorage(STORAGE_KEYS.VOLUME, 100));
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => loadStorage(STORAGE_KEYS.TIME, 0));
  const [duration, setDuration] = useState(() => loadStorage(STORAGE_KEYS.DURATION, 0));

  // The native HTML5 audio engine lives inside <Player />.
  const engineRef = useRef(null);
  const registerEngine = useCallback((instance) => {
    engineRef.current = instance;
  }, []);

  const lastSavedTimeRef = useRef(currentTime);

  const seekTo = useCallback((time) => {
    engineRef.current?.seekTo?.(time);
    setCurrentTime(time);
    lastSavedTimeRef.current = time;
    saveStorage(STORAGE_KEYS.TIME, Math.floor(time));
  }, []);

  const updateCurrentTime = useCallback((time) => {
    setCurrentTime(time);
    if (Math.abs(time - lastSavedTimeRef.current) >= 1) {
      lastSavedTimeRef.current = time;
      saveStorage(STORAGE_KEYS.TIME, Math.floor(time));
    }
  }, []);

  const onPlayRef = useRef(null);
  const registerOnPlay = useCallback((callback) => {
    onPlayRef.current = callback;
  }, []);

  // Save changes to localStorage so they survive page refresh
  useEffect(() => {
    saveStorage(STORAGE_KEYS.CURRENT_SONG, currentSong);
  }, [currentSong]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.QUEUE, songList);
  }, [songList]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.INDEX, currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.VOLUME, volume);
  }, [volume]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.SHUFFLE, shuffle);
  }, [shuffle]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.REPEAT, repeatMode);
  }, [repeatMode]);

  useEffect(() => {
    if (duration > 0) {
      saveStorage(STORAGE_KEYS.DURATION, Math.floor(duration));
    }
  }, [duration]);

  // Single entry point every page uses to start playback.
  const playSong = useCallback((rawSong, queue, index) => {
    const song = normalizeSong(rawSong);
    if (!song.audio_url) return false;

    const list = Array.isArray(queue) && queue.length > 0 ? queue : [song];
    const resolvedIndex =
      typeof index === "number" && index >= 0
        ? index
        : list.findIndex((item) => songId(item) === songId(song));

    setSongList(list);
    setCurrentIndex(resolvedIndex >= 0 ? resolvedIndex : 0);
    setCurrentSong(song);
    setIsPlaying(true);
    onPlayRef.current?.(song);
    return true;
  }, []);

  const playAt = useCallback(
    (index) => {
      if (!songList.length) return;
      const safeIndex = ((index % songList.length) + songList.length) % songList.length;
      const song = normalizeSong(songList[safeIndex]);
      if (!song.audio_url) return;
      setCurrentIndex(safeIndex);
      setCurrentSong(song);
      setIsPlaying(true);
      onPlayRef.current?.(song);
    },
    [songList]
  );

  const playNext = useCallback(() => {
    if (!songList.length) return;
    if (shuffle) {
      if (songList.length === 1) return playAt(0);
      let next = currentIndex;
      while (next === currentIndex) next = Math.floor(Math.random() * songList.length);
      return playAt(next);
    }
    const atEnd = currentIndex >= songList.length - 1;
    if (atEnd && repeatMode === "off") return;
    playAt(currentIndex + 1);
  }, [songList, shuffle, currentIndex, repeatMode, playAt]);

  const playPrevious = useCallback(() => {
    if (!songList.length) return;
    playAt(currentIndex - 1);
  }, [songList, currentIndex, playAt]);

  const onTrackEnd = useCallback(() => {
    if (repeatMode === "one") {
      seekTo(0);
      engineRef.current?.play?.();
      return;
    }
    playNext();
  }, [repeatMode, seekTo, playNext]);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => REPEAT_MODES[(REPEAT_MODES.indexOf(prev) + 1) % REPEAT_MODES.length]);
  }, []);

  const removeFromQueue = useCallback((index) => {
    setSongList((prev) => prev.filter((_, i) => i !== index));
    setCurrentIndex((prev) => (index < prev ? prev - 1 : prev));
  }, []);

  const clearQueue = useCallback(() => {
    setSongList((prev) => (prev.length ? [prev[currentIndex]] : []));
    setCurrentIndex(0);
  }, [currentIndex]);

  const moveQueueItem = useCallback((fromIndex, toIndex) => {
    setSongList((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex < 0 || fromIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setCurrentIndex((curr) => {
      if (curr === fromIndex) return toIndex;
      if (fromIndex < curr && toIndex >= curr) return curr - 1;
      if (fromIndex > curr && toIndex <= curr) return curr + 1;
      return curr;
    });
  }, []);

  const value = useMemo(
    () => ({
      currentSong,
      songList,
      setSongList,
      currentIndex,
      setCurrentIndex,
      searchQuery,
      setSearchQuery,
      isPlaying,
      setIsPlaying,
      shuffle,
      setShuffle,
      repeatMode,
      cycleRepeat,
      volume,
      setVolume,
      isQueueOpen,
      setIsQueueOpen,
      isNowPlayingOpen,
      setIsNowPlayingOpen,
      currentTime,
      setCurrentTime: updateCurrentTime,
      duration,
      setDuration,
      seekTo,
      registerEngine,
      playSong,
      playAt,
      playNext,
      playPrevious,
      onTrackEnd,
      removeFromQueue,
      clearQueue,
      moveQueueItem,
      registerOnPlay,
    }),
    [
      currentSong,
      songList,
      currentIndex,
      searchQuery,
      isPlaying,
      shuffle,
      repeatMode,
      cycleRepeat,
      volume,
      isQueueOpen,
      isNowPlayingOpen,
      currentTime,
      duration,
      seekTo,
      registerEngine,
      playSong,
      playAt,
      playNext,
      playPrevious,
      onTrackEnd,
      removeFromQueue,
      clearQueue,
      moveQueueItem,
      registerOnPlay,
      updateCurrentTime,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => useContext(PlayerContext);
