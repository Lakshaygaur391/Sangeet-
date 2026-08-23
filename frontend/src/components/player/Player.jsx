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

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  // Register Audio Engine controls with PlayerContext
  useEffect(() => {
    registerEngine({
      seekTo: (time) => {
        if (audioRef.current && Number.isFinite(time)) {
          try {
            audioRef.current.currentTime = time;
          } catch (e) {
            console.warn("Audio seek error:", e.message);
          }
        }
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
    if (audioRef.current && !isScrubbing) {
      setCurrentTime(audioRef.current.currentTime || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setDuration(dur);
      }
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  };

  const handleSliderStart = (e) => {
    setIsScrubbing(true);
    setScrubTime(Number(e.target.value));
  };

  const handleSliderChange = (e) => {
    setScrubTime(Number(e.target.value));
  };

  const handleSliderEnd = (e) => {
    const val = Number(e.target.value);
    setIsScrubbing(false);
    seekTo(val);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 60);
    }
  };

  if (!currentSong) return null;

  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPct = duration ? Math.min(100, (displayTime / duration) * 100) : 0;

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
      <div className="fixed inset-x-0 bottom-0 z-40 hidden h-[92px] items-center gap-4 border-t border-white/10 bg-[#0f0f10]/97 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl md:flex md:px-6">
        {/* Now playing thumbnail & title */}
        <button
          type="button"
          onClick={() => setIsNowPlayingOpen(true)}
          className="flex w-[26%] min-w-0 items-center gap-3 text-left"
          aria-label="Open Now Playing"
        >
          <img
            src={currentSong.thumbnail_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg object-cover shadow-lg"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{currentSong.title}</p>
            <p className="truncate text-xs text-white/50">{currentSong.artist}</p>
          </div>
        </button>

        {/* Like */}
        <button
          type="button"
          aria-label={isLiked(currentSong) ? "Unlike song" : "Like song"}
          onClick={() => toggleLike(currentSong)}
          className={`shrink-0 text-xl transition hover:scale-110 ${
            isLiked(currentSong) ? "text-amber-400" : "text-white/40 hover:text-white"
          }`}
        >
          {isLiked(currentSong) ? <IoMdHeart /> : <IoMdHeartEmpty />}
        </button>

        {/* Controls */}
        <div className="flex flex-1 flex-col items-center">
          <div className="flex items-center gap-3 text-xl text-white">
            <button
              type="button"
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
              onClick={() => setShuffle((v) => !v)}
              className={`rounded-full p-2 transition hover:bg-white/10 ${
                shuffle ? "text-amber-300" : "text-white/55"
              }`}
            >
              <IoShuffle className="text-base" />
            </button>
            <button
              type="button"
              aria-label="Previous"
              onClick={playPrevious}
              className="rounded-full p-2 transition hover:bg-white/10"
            >
              <IoPlaySkipBack />
            </button>
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-black transition hover:bg-amber-300 shadow-md active:scale-95"
            >
              {isPlaying ? <IoPause /> : <IoPlay className="translate-x-0.5" />}
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={playNext}
              className="rounded-full p-2 transition hover:bg-white/10"
            >
              <IoPlaySkipForward />
            </button>
            <button
              type="button"
              aria-label={`Repeat: ${repeatMode}`}
              aria-pressed={repeatMode !== "off"}
              onClick={cycleRepeat}
              className={`relative rounded-full p-2 transition hover:bg-white/10 ${
                repeatMode !== "off" ? "text-amber-300" : "text-white/55"
              }`}
            >
              <IoRepeat className="text-base" />
              {repeatMode === "one" && (
                <span className="absolute -top-0.5 right-0 rounded-full bg-amber-400 px-1 text-[8px] font-bold text-black">
                  1
                </span>
              )}
            </button>
          </div>

          <div className="mt-1.5 flex w-full max-w-xl items-center gap-2.5">
            <span className="w-9 text-right text-[11px] tabular-nums text-white/40">
              {formatTime(displayTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={Math.min(displayTime, duration || 100)}
              onMouseDown={handleSliderStart}
              onTouchStart={handleSliderStart}
              onChange={handleSliderChange}
              onMouseUp={handleSliderEnd}
              onTouchEnd={handleSliderEnd}
              aria-label="Seek track"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-transparent accent-amber-400"
              style={{
                background: `linear-gradient(to right, #eab34a ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}%)`,
              }}
            />
            <span className="w-9 text-left text-[11px] tabular-nums text-white/40">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex w-[18%] min-w-fit items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Queue"
            onClick={() => setIsQueueOpen(true)}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <IoListOutline className="text-lg" />
          </button>

          <div className="hidden items-center gap-1.5 lg:flex">
            <button
              type="button"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              onClick={toggleMute}
              className="text-white/60 hover:text-white"
            >
              {volume === 0 ? <IoVolumeMute /> : <IoVolumeHigh />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1.5 w-20 cursor-pointer accent-amber-400"
            />
          </div>

          <button
            type="button"
            aria-label="Open Now Playing"
            onClick={() => setIsNowPlayingOpen(true)}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <IoExpand className="text-lg" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Player;
