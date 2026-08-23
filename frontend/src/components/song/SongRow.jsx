import { useState, useRef, useEffect, memo } from "react";
import {
  IoPlay,
  IoPause,
  IoEllipsisHorizontal,
  IoListOutline,
  IoPlaySkipForwardOutline,
  IoAddCircleOutline,
} from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId, formatTime } from "../../lib/media";

// Compact row used in playlist tracklists, Library, Queue, Artist popular tracks.
const SongRow = memo(({ song: rawSong, queue, index, showIndex = true, duration, onMenu, onAddToPlaylist }) => {
  const song = normalizeSong(rawSong);
  const { currentSong, isPlaying, playSong, setIsPlaying, addToQueue, playNextInQueue } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isActive = currentSong && songId(currentSong) === songId(song);
  const liked = isLiked(song);
  const unavailable = !song.audio_url;
  const secondaryLabel = song.album || song.language || "";

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handlePlay = () => {
    if (isActive) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    playSong(song, queue, index);
  };

  const handleAddToQueue = (e) => {
    e?.stopPropagation();
    setMenuOpen(false);
    const ok = addToQueue(song);
    if (ok) {
      toast(`Added "${song.title}" to queue`, "success");
    }
  };

  const handlePlayNext = (e) => {
    e?.stopPropagation();
    setMenuOpen(false);
    const ok = playNextInQueue(song);
    if (ok) {
      toast(`Playing "${song.title}" next`, "success");
    }
  };

  const handleAddToPlaylist = (e) => {
    e?.stopPropagation();
    setMenuOpen(false);
    if (!isAuthenticated) {
      openAuthPrompt("playlist");
      return;
    }
    onAddToPlaylist?.(song);
  };

  return (
    <div
      className={`group grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors sm:grid-cols-[2rem_1fr_6rem_auto] ${
        isActive ? "bg-amber-400/[0.07]" : "hover:bg-white/[0.04]"
      } ${unavailable ? "opacity-60" : ""}`}
    >
      {/* Track index / play button */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center text-sm text-white/40">
        {isActive ? (
          <button
            type="button"
            onClick={handlePlay}
            aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
            className="flex items-center justify-center text-amber-400"
          >
            {isPlaying ? (
              <span className="eq-bars">
                <span /><span /><span />
              </span>
            ) : (
              <IoPause className="text-lg" />
            )}
          </button>
        ) : (
          <>
            {showIndex && (
              <span className="group-hover:hidden tabular-nums">{(index ?? 0) + 1}</span>
            )}
            <button
              type="button"
              onClick={handlePlay}
              disabled={unavailable}
              aria-label={`Play ${song.title}`}
              className={`items-center justify-center text-lg text-white disabled:cursor-not-allowed disabled:text-white/20 ${
                showIndex ? "hidden group-hover:flex" : "flex"
              }`}
            >
              <IoPlay />
            </button>
          </>
        )}
      </div>

      {/* Artwork + title + artist */}
      <button type="button" onClick={handlePlay} className="flex min-w-0 items-center gap-3 text-left">
        <img
          src={song.thumbnail_url}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-10 w-10 shrink-0 rounded-lg object-cover shadow-sm transition-transform group-hover:scale-105 ${unavailable ? "grayscale" : ""}`}
        />
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold leading-snug sm:text-[0.9rem] ${isActive ? "text-amber-300" : "text-white"}`}
            title={song.title}
          >
            {song.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-white/45" title={song.artist}>
            {song.artist}
          </p>
        </div>
      </button>

      {/* Album / language — desktop only */}
      <div className="hidden truncate text-xs text-white/35 sm:block" title={secondaryLabel}>
        {secondaryLabel}
      </div>

      {/* Right actions: duration + quick queue + like + more */}
      <div className="flex items-center gap-1.5">
        {(duration != null || song.duration) && (
          <span className="hidden tabular-nums text-xs text-white/35 sm:inline">
            {formatTime(duration ?? song.duration)}
          </span>
        )}

        {/* Quick Add to Queue button visible on hover */}
        <button
          type="button"
          title="Add to queue"
          aria-label="Add to queue"
          onClick={handleAddToQueue}
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-white/45 opacity-0 transition hover:bg-white/10 hover:text-amber-300 group-hover:opacity-100"
        >
          <IoListOutline className="text-lg" />
        </button>

        {/* Like Button */}
        <button
          type="button"
          aria-label={liked ? "Unlike song" : "Like song"}
          aria-pressed={liked}
          onClick={() => toggleLike(song)}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-150 hover:scale-110 sm:opacity-0 sm:group-hover:opacity-100 ${
            liked ? "text-amber-400 !opacity-100" : "text-white/40 hover:text-amber-300"
          }`}
        >
          {liked ? <IoMdHeart /> : <IoMdHeartEmpty />}
        </button>

        {/* More options dropdown menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              if (onMenu) {
                onMenu(song);
              } else {
                setMenuOpen((v) => !v);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white/40 transition hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
          >
            <IoEllipsisHorizontal />
          </button>

          {menuOpen && !onMenu && (
            <div
              role="menu"
              className="animate-scale-in absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1c] py-1.5 shadow-2xl shadow-black/60 backdrop-blur-lg"
            >
              <button
                role="menuitem"
                type="button"
                onClick={handleAddToQueue}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-amber-300 transition-colors"
              >
                <IoListOutline className="text-base text-amber-400 shrink-0" /> Add to queue
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={handlePlayNext}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-amber-300 transition-colors"
              >
                <IoPlaySkipForwardOutline className="text-base text-amber-400 shrink-0" /> Play next
              </button>
              {(onAddToPlaylist || !onMenu) && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleAddToPlaylist}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-amber-300 transition-colors"
                >
                  <IoAddCircleOutline className="text-base text-amber-400 shrink-0" /> Add to playlist
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SongRow.displayName = "SongRow";
export default SongRow;
