import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
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

const ytOpts = { width: "0", height: "0", playerVars: { autoplay: 1, playsinline: 1 } };

const Player = () => {
  const {
    currentVideoId,
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
  const ytPlayerRef = useRef(null);
  const [prevVolume, setPrevVolume] = useState(100);

  const hasAudioUrl = Boolean(currentSong?.audio_url);
  const safeVideoId =
    !hasAudioUrl && currentVideoId && /^[A-Za-z0-9_-]{11}$/.test(currentVideoId)
      ? currentVideoId
      : null;

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
        if (hasAudioUrl && audioRef.current) {
          audioRef.current.currentTime = time;
        } else if (ytPlayerRef.current) {
          ytPlayerRef.current.seekTo?.(time, true);
        }
      },
      play: () => {
        if (hasAudioUrl && audioRef.current) {
          audioRef.current.play().catch(() => {});
        } else if (ytPlayerRef.current) {
          ytPlayerRef.current.playVideo?.();
        }
      },
      pause: () => {
        if (hasAudioUrl && audioRef.current) {
          audioRef.current.pause();
        } else if (ytPlayerRef.current) {
          ytPlayerRef.current.pauseVideo?.();
        }
      },
    });
  }, [hasAudioUrl, registerEngine]);

  // Synchronize Play / Pause state with HTML5 Audio
  useEffect(() => {
    if (!hasAudioUrl || !audioRef.current) return;
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Autoplay policy or media load error
          console.warn("Audio playback interrupted:", err.message);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong?.audio_url, hasAudioUrl]);

  // Synchronize Volume with HTML5 Audio and YouTube
  useEffect(() => {
    if (hasAudioUrl && audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
    } else if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume?.(volume);
    }
  }, [volume, hasAudioUrl]);

  // YouTube Fallback Handlers
  const onYtReady = (event) => {
    ytPlayerRef.current = event.target;
    if (!hasAudioUrl) {
      setDuration(event.target.getDuration());
      event.target.setVolume(volume);
      if (isPlaying) event.target.playVideo();
    }
  };

  const onYtStateChange = (event) => {
    if (!hasAudioUrl && event.data === 0) {
      onTrackEnd();
    }
  };

  // HTML5 Audio Event Listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleAudioEnded = () => {
    onTrackEnd();
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    seekTo(time);
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

  return (
    <>
      {/* Primary HTML5 Audio Engine for Background Playback */}
      {hasAudioUrl && (
        <audio
          ref={audioRef}
          src={currentSong.audio_url}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* Fallback YouTube Engine (only if song lacks direct audio_url) */}
      {!hasAudioUrl && safeVideoId && (
        <div className="sr-only">
          <YouTube
            videoId={safeVideoId}
            opts={ytOpts}
            onReady={onYtReady}
            onStateChange={onYtStateChange}
          />
        </div>
      )}

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
            <p className="truncate text-xs text-white/45">{currentSong.artist}</p>
          </div>
        </button>

        <button
          type="button"
          aria-label={isLiked(currentSong) ? "Unlike song" : "Like song"}
          onClick={() => toggleLike(currentSong)}
          className="shrink-0 text-lg text-white/50 transition hover:text-amber-300"
        >
          {isLiked(currentSong) ? <IoMdHeart className="text-amber-400" /> : <IoMdHeartEmpty />}
        </button>

        {/* Transport controls */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="flex items-center gap-4 text-xl text-white">
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-black transition hover:bg-amber-300 shadow-md"
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
            <span className="w-9 text-right text-[11px] text-white/40">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={handleSeek}
              aria-label="Seek"
              className="h-1.5 w-full cursor-pointer accent-amber-400"
            />
            <span className="w-9 text-left text-[11px] text-white/40">
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
