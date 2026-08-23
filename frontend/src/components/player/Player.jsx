import { useEffect, useRef, useState } from "react";
import {
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoPlay,
  IoPause,
  IoShuffle,
  IoRepeat,
  IoVolumeHigh,
  IoVolumeMute,
  IoListOutline,
  IoExpand,
} from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { formatTime } from "../../lib/media";
import useMediaSession from "../../hooks/useMediaSession";

const Player = () => {
  const {
    currentSong,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    onTrackEnd,
    shuffle,
    setShuffle,
    repeatMode,
    cycleRepeat,
    volume,
    setVolume,
    setIsQueueOpen,
    setIsNowPlayingOpen,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    registerEngine,
    seekTo,
  } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();

  const audioRef = useRef(null);
  const [prevVolume, setPrevVolume] = useState(100);

  // OS Notification, Lock-Screen, and Headphone Controls
  useMediaSession({
    currentSong,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    seekTo,
    duration,
    currentTime,
  });

  // Register Audio Engine controls with PlayerContext
  useEffect(() => {
    registerEngine({
      seekTo: (time) => {
        if (audioRef.current) audioRef.current.currentTime = time;
      },
      play: () => {
        audioRef.current?.play().catch(() => {});
      },
      pause: () => {
        audioRef.current?.pause();
      },
    });
  }, [registerEngine]);

  // Synchronize Play / Pause state with HTML5 Audio
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      const p = audioRef.current.play();
      if (p !== undefined) {
        p.catch((err) => console.warn("Audio playback interrupted:", err.message));
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong?.audio_url]);

  // Synchronize Volume with HTML5 Audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }, [volume]);

  // HTML5 Audio Event Handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime || 0);
  };

  const restoredTimeRef = useRef(true);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
      if (restoredTimeRef.current && currentTime > 0) {
        try {
          audioRef.current.currentTime = currentTime;
        } catch {
          // Ignore
        }
        restoredTimeRef.current = false;
      }
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (e) => seekTo(Number(e.target.value));

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 60);
    }
  };

  if (!currentSong) return null;

  const progressPct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <>
      {/* Native HTML5 Audio — enables background play, OS controls, Bluetooth */}
      <audio
        ref={audioRef}
        src={currentSong.audio_url || ""}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={onTrackEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Desktop Transport Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 hidden h-[90px] items-center gap-4 border-t border-white/[0.07] bg-[#0c0c0d]/96 px-4 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:flex md:px-6">

        {/* Left: Now playing thumbnail & title */}
        <button
          type="button"
          onClick={() => setIsNowPlayingOpen(true)}
          className="group flex w-[22%] min-w-0 items-center gap-3 text-left"
          aria-label="Open Now Playing"
        >
          <div className="relative shrink-0">
            <img
              src={currentSong.thumbnail_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover shadow-lg shadow-black/50 transition-transform duration-300 group-hover:scale-105"
            />
            {/* Active glow ring */}
            {isPlaying && (
              <span className="absolute -inset-0.5 rounded-[14px] bg-amber-400/20 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white group-hover:text-amber-200 transition-colors" title={currentSong.title}>
              {currentSong.title}
            </p>
            <p className="truncate text-xs text-white/45 mt-0.5" title={currentSong.artist}>
              {currentSong.artist}
            </p>
          </div>
        </button>

        {/* Like button */}
        <button
          type="button"
          aria-label={isLiked(currentSong) ? "Unlike song" : "Like song"}
          onClick={() => toggleLike(currentSong)}
          className={`shrink-0 text-lg transition-all duration-200 hover:scale-110 ${
            isLiked(currentSong) ? "text-amber-400" : "text-white/40 hover:text-amber-300"
          }`}
        >
          {isLiked(currentSong) ? <IoMdHeart /> : <IoMdHeartEmpty />}
        </button>

        {/* Center: Transport controls + progress */}
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-3 text-xl text-white">
            <button
              type="button"
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
              onClick={() => setShuffle((v) => !v)}
              className={`rounded-full p-2 transition-all duration-200 hover:bg-white/8 ${
                shuffle ? "text-amber-300" : "text-white/45 hover:text-white"
              }`}
            >
              <IoShuffle className="text-[1.1rem]" />
            </button>
            <button
              type="button"
              aria-label="Previous"
              onClick={playPrevious}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/8 hover:text-white"
            >
              <IoPlaySkipBack />
            </button>
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg shadow-amber-500/30 transition-all duration-200 hover:scale-105 hover:shadow-amber-500/40 active:scale-95"
            >
              {isPlaying ? <IoPause className="text-[1.2rem]" /> : <IoPlay className="translate-x-0.5 text-[1.2rem]" />}
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={playNext}
              className="rounded-full p-2 text-white/80 transition hover:bg-white/8 hover:text-white"
            >
              <IoPlaySkipForward />
            </button>
            <button
              type="button"
              aria-label={`Repeat: ${repeatMode}`}
              aria-pressed={repeatMode !== "off"}
              onClick={cycleRepeat}
              className={`relative rounded-full p-2 transition-all duration-200 hover:bg-white/8 ${
                repeatMode !== "off" ? "text-amber-300" : "text-white/45 hover:text-white"
              }`}
            >
              <IoRepeat className="text-[1.1rem]" />
              {repeatMode === "one" && (
                <span className="absolute -top-0.5 right-0 rounded-full bg-amber-400 px-1 text-[8px] font-bold text-black leading-none py-0.5">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex w-full max-w-lg items-center gap-2.5">
            <span className="w-9 text-right text-[11px] tabular-nums text-white/35">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeek}
                aria-label="Seek"
                className="h-1 w-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #eab34a ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}%)`,
                }}
              />
            </div>
            <span className="w-9 text-left text-[11px] tabular-nums text-white/35">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right controls: Queue, Volume, Expand */}
        <div className="flex w-[18%] min-w-fit items-center justify-end gap-1">
          <button
            type="button"
            aria-label="Queue"
            onClick={() => setIsQueueOpen(true)}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/8 hover:text-white"
          >
            <IoListOutline className="text-[1.2rem]" />
          </button>

          <div className="hidden items-center gap-1.5 lg:flex">
            <button
              type="button"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              onClick={toggleMute}
              className="text-white/50 hover:text-white transition p-1"
            >
              {volume === 0 ? <IoVolumeMute className="text-lg" /> : <IoVolumeHigh className="text-lg" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-20 cursor-pointer"
              style={{
                background: `linear-gradient(to right, #eab34a ${volume}%, rgba(255,255,255,0.12) ${volume}%)`,
              }}
            />
          </div>

          <button
            type="button"
            aria-label="Open Now Playing"
            title="Expand Full Screen (Now Playing)"
            onClick={() => setIsNowPlayingOpen(true)}
            className="rounded-full p-2 text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-amber-300 hover:scale-110 active:scale-95"
          >
            <IoExpand className="text-[1.2rem]" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Player;
