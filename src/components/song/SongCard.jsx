import { useState, useRef, useEffect } from "react";
import { IoPlay, IoPause, IoEllipsisHorizontal, IoAddCircleOutline } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId } from "../../lib/media";

// Premium artwork-forward song card for grid & carousel layouts
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
  const unavailable = !song.audio_url;

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
      setIsPlaying(!isPlaying);
      return;
    }
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    playSong(song, queue, index);
  };

  return (
    <div
      className={`group relative flex flex-col w-full rounded-2xl border bg-[#111112] text-white shadow-lg shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 ${
        isActive
          ? "border-amber-400/50 shadow-amber-400/15 ring-1 ring-amber-400/25"
          : "border-white/[0.08] hover:border-white/20"
      }`}
    >
      {/* Artwork + Play overlay */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-white/5">
        <button
          type="button"
          onClick={handlePlay}
          disabled={unavailable}
          aria-label={isActive && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
          className="relative block h-full w-full disabled:cursor-not-allowed text-left"
        >
          <img
            src={song.thumbnail_url}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              unavailable ? "grayscale opacity-40" : ""
            }`}
          />
          {/* Subtle dark gradient overlay on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Floating Play / Pause button */}
          <span
            className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-xl shadow-black/60 transition-all duration-300 ${
              isActive
                ? "opacity-100 scale-100 translate-y-0"
                : "translate-y-2 scale-90 opacity-0 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100"
            }`}
          >
            {isActive && isPlaying ? (
              <IoPause className="text-xl" />
            ) : (
              <IoPlay className="translate-x-0.5 text-xl" />
            )}
          </span>

          {/* Active equalizer bars */}
          {isActive && isPlaying && (
            <span className="absolute bottom-3 left-3 flex items-center justify-center rounded-lg bg-black/60 px-2 py-1 backdrop-blur-md">
              <span className="eq-bars">
                <span /><span /><span />
              </span>
            </span>
          )}

          {/* Unavailable badge */}
          {unavailable && (
            <span className="absolute inset-x-0 bottom-0 bg-black/85 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white/60 backdrop-blur-sm">
              Unavailable
            </span>
          )}
        </button>
      </div>

      {/* Info Section — full-width title & artist, balanced action sub-row */}
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          {/* Song Title — Full Width */}
          <p
            className={`truncate text-sm font-semibold leading-snug sm:text-[0.9375rem] ${
              isActive ? "text-amber-300 font-bold" : "text-white group-hover:text-white"
            }`}
            title={song.title}
          >
            {song.title}
          </p>

          {/* Artist Name — Full Width */}
          <p
            className="mt-1 truncate text-xs text-white/50 sm:text-[0.8125rem]"
            title={song.artist}
          >
            {song.artist}
          </p>
        </div>

        {/* Metadata & Actions Sub-Row */}
        <div className="mt-3 flex items-center justify-between pt-1 border-t border-white/[0.04]">
          {/* Language / Album badge if available */}
          <span className="truncate max-w-[65%] text-[10px] font-medium tracking-wide uppercase text-white/40">
            {song.language || song.album || "Track"}
          </span>

          {/* Actions: Like + More */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={liked ? "Unlike song" : "Like song"}
              aria-pressed={liked}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike(song);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform duration-150 hover:scale-110 ${
                liked ? "text-amber-400" : "text-white/35 hover:text-amber-300"
              }`}
            >
              {liked ? <IoMdHeart /> : <IoMdHeartEmpty />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-white/35 transition hover:text-white"
              >
                <IoEllipsisHorizontal />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="animate-scale-in absolute right-0 bottom-full mb-1.5 z-50 w-36 sm:w-40 overflow-hidden rounded-xl border border-white/15 bg-[#1a1a1c]/98 py-1 shadow-2xl shadow-black/90 backdrop-blur-2xl"
                >
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleAddToPlaylist}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-white/85 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <IoAddCircleOutline className="text-base text-amber-400 shrink-0" />
                    <span className="truncate">Add to playlist</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongCard;
