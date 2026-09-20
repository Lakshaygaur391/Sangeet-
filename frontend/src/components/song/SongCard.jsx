import { useState, useRef, useEffect, memo } from "react";
import { IoPlay, IoPause, IoEllipsisHorizontal, IoAddCircleOutline, IoMusicalNotes } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId } from "../../lib/media";
import MediaOptionsMenu from "../ui/MediaOptionsMenu";

// Spotify/Apple Music-grade clean song card
const SongCard = memo(({ song: rawSong, queue, index, onAddToPlaylist }) => {
  const song = normalizeSong(rawSong);
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isActive = currentSong && songId(currentSong) === songId(song);
  const liked = isLiked(song);
  const unavailable = !song.audio_url;

  const handleAddToPlaylist = (e) => {
    e?.stopPropagation();
    setMenuOpen(false);
    if (!isAuthenticated) {
      openAuthPrompt("playlist");
      return;
    }
    onAddToPlaylist?.(song);
  };

  const handleLike = (e) => {
    e?.stopPropagation();
    if (!isAuthenticated) {
      openAuthPrompt("like");
      return;
    }
    toggleLike(song);
  };


  const handlePlay = (e) => {
    e?.stopPropagation();
    if (isActive) {
      setIsPlaying(!isPlaying);
      return;
    }
    playSong(song, queue, index);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handlePlay}
      onKeyDown={(e) => e.key === "Enter" && handlePlay(e)}
      className={`group relative flex flex-col w-full cursor-pointer rounded-xl p-3 sm:p-3.5 text-left transition-all duration-300 select-none ${
        menuOpen ? "z-40" : "z-10"
      } ${
        isActive
          ? "bg-[#18181f] ring-1 ring-amber-400/40 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          : "bg-[#141417]/80 hover:bg-[#1e1e24] shadow-md shadow-black/40 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-1"
      } ${unavailable ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {/* Artwork container — Spotify-style rounded square */}
      <div className="relative aspect-square w-full rounded-lg bg-[#18181b] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
        <div className="relative h-full w-full overflow-hidden rounded-lg">
          {!imgError && song.thumbnail_url ? (
            <img
              src={song.thumbnail_url}
              alt={song.title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${
                unavailable ? "grayscale opacity-40" : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 via-[#1e1e24] to-[#121215]">
              <IoMusicalNotes className="text-4xl text-amber-400/50" />
            </div>
          )}

          {/* Hover dark gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Top-Right Quick Action Buttons (Like & More Options) — visible on mobile, hover on desktop */}
        <div
          className={`absolute top-2 right-2 z-30 flex items-center gap-1.5 transition-all duration-200 ${
            liked || menuOpen
              ? "opacity-100"
              : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          }`}
        >
          {/* Like Heart Button */}
          <button
            type="button"
            aria-label={liked ? "Unlike song" : "Like song"}
            aria-pressed={liked}
            onClick={handleLike}
            className={`flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 shadow-md ${
              liked
                ? "bg-black/70 text-amber-400 shadow-amber-500/20"
                : "bg-black/50 text-white/80 hover:bg-black/80 hover:text-amber-300"
            }`}
          >
            {liked ? <IoMdHeart className="text-sm" /> : <IoMdHeartEmpty className="text-sm" />}
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white/80 transition-all duration-200 hover:bg-black/80 hover:text-white hover:scale-110 active:scale-95 shadow-md"
            >
              <IoEllipsisHorizontal className="text-xs" />
            </button>

            <MediaOptionsMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              song={song}
              queue={queue}
              index={index}
              onAddToPlaylist={onAddToPlaylist}
              align="right"
              position="bottom"
              itemType="song"
            />
          </div>
        </div>

        {/* Floating Play / Pause Button (Spotify Signature Style) */}
        <button
          type="button"
          onClick={handlePlay}
          disabled={unavailable}
          aria-label={isActive && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
          className={`absolute bottom-2 right-2 z-20 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-xl shadow-black/70 transition-all duration-300 hover:scale-110 hover:shadow-amber-500/40 active:scale-95 ${
            isActive
              ? "opacity-100 scale-100 translate-y-0 shadow-amber-500/30"
              : "translate-y-2 scale-90 opacity-0 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-hover:shadow-amber-500/30"
          }`}
        >
          {isActive && isPlaying ? (
            <IoPause className="text-lg sm:text-xl" />
          ) : (
            <IoPlay className="translate-x-0.5 text-lg sm:text-xl" />
          )}
        </button>

        {/* Live Active Equalizer Badge (Bottom-Left) */}
        {isActive && isPlaying && (
          <span className="absolute bottom-2 left-2 z-10 flex items-center justify-center rounded-md bg-black/75 px-1.5 py-1 backdrop-blur-md shadow-md border border-white/10">
            <span className="eq-bars">
              <span /><span /><span />
            </span>
          </span>
        )}

        {/* Unavailable overlay badge */}
        {unavailable && (
          <span className="absolute inset-x-0 bottom-0 bg-black/90 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-white/60 backdrop-blur-sm">
            Unavailable
          </span>
        )}
      </div>

      {/* Track Info Section — Spotify-grade clean typography */}
      <div className="mt-3 flex flex-col">
        {/* Song Title */}
        <p
          className={`truncate text-sm font-semibold leading-tight transition-colors duration-200 ${
            isActive ? "text-amber-400 font-bold" : "text-white group-hover:text-white"
          }`}
          title={song.title}
        >
          {song.title}
        </p>

        {/* Artist Name */}
        <p
          className="mt-1 truncate text-xs font-normal text-[#a7a7a7] transition-colors duration-200 group-hover:text-[#d4d4d8]"
          title={song.artist}
        >
          {song.artist}
        </p>
      </div>
    </div>
  );
});

SongCard.displayName = "SongCard";
export default SongCard;
