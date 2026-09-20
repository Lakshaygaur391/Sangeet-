import { useState, useRef, useEffect, memo } from "react";
import { IoPlay, IoPause, IoEllipsisHorizontal, IoAddCircleOutline } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId, formatTime } from "../../lib/media";
import MediaOptionsMenu from "../ui/MediaOptionsMenu";

// Compact row used in playlist tracklists, Library, Queue, Artist popular tracks.
const SongRow = memo(({ song: rawSong, queue, index, showIndex = true, duration, onMenu, onAddToPlaylist, action }) => {
  const song = normalizeSong(rawSong);
  const { currentSong, isPlaying, playSong, setIsPlaying, addToQueue } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
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
    playSong(song, queue, index);
  };

  const handleAddToQueue = (e) => {
    e?.stopPropagation();
    if (song) {
      addToQueue(song);
      toast?.(`Added "${song.title}" to queue`, "success");
    }
  };


  return (
    <div
      className={`group grid grid-cols-[2rem_1fr_auto] items-center gap-2 pl-2.5 pr-1 py-2 transition-colors sm:grid-cols-[2rem_1fr_6rem_auto] sm:gap-3 sm:px-3 ${
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
      <button type="button" onClick={handlePlay} className="flex min-w-0 items-center gap-2.5 sm:gap-3 text-left">
        {!imgError && song.thumbnail_url ? (
          <img
            src={song.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className={`h-10 w-10 shrink-0 rounded-lg object-cover shadow-sm transition-transform group-hover:scale-105 ${unavailable ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs font-bold text-amber-400">
            ♪
          </div>
        )}
        <div className="min-w-0 flex-1">
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

      {/* Right actions: custom action + duration + like + more */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {action}
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
          className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-all duration-150 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 ${
            liked ? "text-amber-400 !opacity-100" : "text-white/60 hover:text-amber-300 active:text-amber-400"
          }`}
        >
          {liked ? <IoMdHeart /> : <IoMdHeartEmpty />}
        </button>

        {/* More menu */}
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
                return;
              }
              setMenuOpen((v) => !v);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-base text-white/60 transition hover:text-white active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <IoEllipsisHorizontal />
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
    </div>
  );
});

SongRow.displayName = "SongRow";
export default SongRow;
