import { useState, useRef, useEffect } from "react";
import { IoPlay, IoPause, IoEllipsisHorizontal, IoAddCircleOutline } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId, formatTime } from "../../lib/media";

// Compact row used in playlist tracklists, Library, Queue, Artist popular tracks.
const SongRow = ({ song: rawSong, queue, index, showIndex = true, duration, onMenu, onAddToPlaylist }) => {
  const song = normalizeSong(rawSong);
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isActive = currentSong && songId(currentSong) === songId(song);
  const liked = isLiked(song);
  const unavailable = !song.audio_url;
  const secondaryLabel = song.album || song.language || "";

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

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

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

      {/* Right actions: duration + like + more */}
      <div className="flex items-center gap-1.5">
        {(duration != null || song.duration) && (
          <span className="hidden tabular-nums text-xs text-white/35 sm:inline">
            {formatTime(duration ?? song.duration)}
          </span>
        )}

        {/* Like — visible on hover (desktop) / always visible (mobile via sm:opacity-0) */}
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

        {/* More menu */}
        {(onMenu || onAddToPlaylist) && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => {
                if (onMenu) { onMenu(song); return; }
                setMenuOpen((v) => !v);
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
                {onAddToPlaylist && (
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => { setMenuOpen(false); onAddToPlaylist(song); }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-white/80 hover:bg-white/[0.06] hover:text-white"
                  >
                    <IoAddCircleOutline className="text-amber-400" /> Add to playlist
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SongRow;

