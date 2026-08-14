import { useState, useRef, useEffect } from "react";
import { IoPlay, IoPause, IoEllipsisHorizontal, IoAddCircleOutline } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId } from "../../lib/media";

// Premium artwork-forward song card for grid layouts (Home, Discover, Search).
const SongCard = ({ song: rawSong, queue, index, onAddToPlaylist }) => {
  const song = normalizeSong(rawSong);
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isActive = currentSong && songId(currentSong) === songId(song);
  const liked = isLiked(song);
  const unavailable = !song.youtube_url && !song._id;

  const handleAddToPlaylist = () => {
    setMenuOpen(false);
    if (!isAuthenticated) {
      openAuthPrompt("playlist");
      return;
    }
    onAddToPlaylist?.(song);
  };

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
      // Already playing this song — just toggle pause/play (no auth needed)
      setIsPlaying(!isPlaying);
      return;
    }
    // Gate playback behind authentication
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    playSong(song, queue, index);
  };

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-2xl border bg-[#161616] text-white shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 ${
        isActive ? "border-amber-400/40 ring-1 ring-amber-400/30" : "border-white/10"
      }`}
    >
      <button
        type="button"
        onClick={handlePlay}
        disabled={unavailable}
        aria-label={isActive && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
        className="relative block w-full disabled:cursor-not-allowed"
      >
        <img
          src={song.thumbnail_url}
          alt=""
          loading="lazy"
          className={`aspect-square w-full object-cover transition ${unavailable ? "grayscale opacity-50" : ""}`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <span
          className={`absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg shadow-black/40 transition ${
            isActive ? "opacity-100" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
          }`}
        >
          {isActive && isPlaying ? <IoPause /> : <IoPlay className="translate-x-0.5" />}
        </span>
        {unavailable && (
          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-[10px] uppercase tracking-wide text-white/70">
            Unavailable
          </span>
        )}
      </button>

      <div className="flex items-start justify-between gap-1 px-3 py-3 text-left">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white sm:text-base">{song.title}</p>
          <p className="truncate text-xs text-white/45 sm:text-sm">{song.artist}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={liked ? "Unlike song" : "Like song"}
            aria-pressed={liked}
            onClick={() => toggleLike(song)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-base text-white/50 transition hover:text-amber-300"
          >
            {liked ? <IoMdHeart className="text-amber-400" /> : <IoMdHeartEmpty />}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition hover:text-white"
            >
              <IoEllipsisHorizontal />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] py-1 shadow-xl shadow-black/40"
              >
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleAddToPlaylist}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/5"
                >
                  <IoAddCircleOutline /> Add to playlist
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongCard;
