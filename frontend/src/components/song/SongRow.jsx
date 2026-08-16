import { useState, useRef, useEffect } from "react";
import { IoPlay, IoPause, IoEllipsisHorizontal, IoListOutline, IoPlaySkipForwardOutline, IoAddCircleOutline } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId, formatTime } from "../../lib/media";

// Compact row used in playlist tracklists, Library, Queue, Artist popular tracks.
const SongRow = ({ song: rawSong, queue, index, showIndex = true, duration, onMenu, onAddToPlaylist }) => {
  const song = normalizeSong(rawSong);
  const { currentSong, isPlaying, playSong, setIsPlaying, addToQueue, playNextInQueue } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isActive = currentSong && songId(currentSong) === songId(song);
  const unavailable = !song.audio_url;

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
      className={`group relative grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/5 sm:grid-cols-[2rem_1fr_8rem_auto] ${
        isActive ? "bg-amber-400/[0.06]" : ""
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center text-sm text-white/40">
        {showIndex && !isActive && <span className="group-hover:hidden">{(index ?? 0) + 1}</span>}
        <button
          type="button"
          onClick={handlePlay}
          disabled={unavailable}
          aria-label={isActive && isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
          className={`items-center justify-center text-lg text-white disabled:cursor-not-allowed disabled:text-white/20 ${
            isActive ? "flex text-amber-400" : "hidden group-hover:flex"
          }`}
        >
          {isActive && isPlaying ? <IoPause /> : <IoPlay />}
        </button>
      </div>

      <button type="button" onClick={handlePlay} className="flex min-w-0 items-center gap-3 text-left">
        <img src={song.thumbnail_url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold sm:text-base ${isActive ? "text-amber-300" : "text-white"}`}>
            {song.title}
          </p>
          <p className="truncate text-xs text-white/45 sm:text-sm">{song.artist}</p>
        </div>
      </button>

      <div className="hidden truncate text-sm text-white/45 sm:block">{song.language || ""}</div>

      <div className="flex items-center gap-1.5">
        {duration != null && <span className="text-xs text-white/35 mr-1">{formatTime(duration)}</span>}

        {/* Quick Add to Queue button visible on hover */}
        <button
          type="button"
          title="Add to queue"
          aria-label="Add to queue"
          onClick={handleAddToQueue}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 opacity-0 transition hover:bg-white/10 hover:text-amber-300 group-hover:opacity-100"
        >
          <IoListOutline className="text-lg" />
        </button>

        {/* Like Button */}
        <button
          type="button"
          aria-label={isLiked(song) ? "Unlike song" : "Like song"}
          onClick={() => toggleLike(song)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 opacity-0 transition hover:text-amber-300 group-hover:opacity-100"
        >
          {isLiked(song) ? <IoMdHeart className="text-amber-400 opacity-100" /> : <IoMdHeartEmpty />}
        </button>

        {/* More options dropdown menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More options"
            onClick={(e) => {
              e.stopPropagation();
              if (onMenu) {
                onMenu(song);
              } else {
                setMenuOpen((v) => !v);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 opacity-0 transition hover:text-white group-hover:opacity-100"
          >
            <IoEllipsisHorizontal />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] py-1 shadow-xl shadow-black/60"
            >
              <button
                role="menuitem"
                type="button"
                onClick={handleAddToQueue}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10 hover:text-amber-300 transition-colors"
              >
                <IoListOutline className="text-base text-amber-400" /> Add to queue
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={handlePlayNext}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10 hover:text-amber-300 transition-colors"
              >
                <IoPlaySkipForwardOutline className="text-base text-amber-400" /> Play next
              </button>
              {onAddToPlaylist && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleAddToPlaylist}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10 hover:text-amber-300 transition-colors"
                >
                  <IoAddCircleOutline className="text-base text-amber-400" /> Add to playlist
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongRow;
