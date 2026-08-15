import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { normalizeSong, songId } from "../lib/media";

const PlayerContext = createContext();

export const REPEAT_MODES = ["off", "all", "one"];

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [songList, setSongList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // off | all | one
  const [volume, setVolume] = useState(100);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // The native HTML5 audio engine lives inside <Player />.
  // It registers its controls here so any UI can seek without
  // mounting a duplicate audio element.
  const engineRef = useRef(null);
  const registerEngine = useCallback((instance) => {
    engineRef.current = instance;
  }, []);

  const seekTo = useCallback((time) => {
    engineRef.current?.seekTo?.(time);
    setCurrentTime(time);
  }, []);

  const onPlayRef = useRef(null);
  const registerOnPlay = useCallback((callback) => {
    onPlayRef.current = callback;
  }, []);

  // Single entry point every page uses to start playback.
  // playSong(song, queue, index)
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

  const value = useMemo(
    () => ({
      currentSong,
      songList,
      setSongList,
      currentIndex,
      setCurrentIndex,
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
      setCurrentTime,
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
      registerOnPlay,
    }),
    [
      currentSong,
      songList,
      currentIndex,
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
      registerOnPlay,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => useContext(PlayerContext);
