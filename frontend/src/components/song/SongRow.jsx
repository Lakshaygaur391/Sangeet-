import { IoPlay, IoPause, IoEllipsisHorizontal } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { normalizeSong, songId, formatTime } from "../../lib/media";

// Compact row used in playlist tracklists, Library, Queue, Artist popular tracks.
const SongRow = ({ song: rawSong, queue, index, showIndex = true, duration, onMenu }) => {
  const song = normalizeSong(rawSong);
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const isActive = currentSong && songId(currentSong) === songId(song);
  const unavailable = !song.audio_url;

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
      className={`group grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/5 sm:grid-cols-[2rem_1fr_8rem_auto] ${
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

      <div className="flex items-center gap-2">
        {duration != null && <span className="text-xs text-white/35">{formatTime(duration)}</span>}
        <button
          type="button"
          aria-label={isLiked(song) ? "Unlike song" : "Like song"}
          onClick={() => toggleLike(song)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 opacity-0 transition hover:text-amber-300 group-hover:opacity-100"
        >
          {isLiked(song) ? <IoMdHeart className="text-amber-400 opacity-100" /> : <IoMdHeartEmpty />}
        </button>
        {onMenu && (
          <button
            type="button"
            aria-label="More options"
            onClick={() => onMenu(song)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 opacity-0 transition hover:text-white group-hover:opacity-100"
          >
            <IoEllipsisHorizontal />
          </button>
        )}
      </div>
    </div>
  );
};

export default SongRow;
