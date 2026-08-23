import { IoPlay, IoPause, IoPlaySkipForward } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";

// Mobile-only compact player. The actual audio engine lives in
// <Player /> (rendered but visually hidden below md), this just reflects
// and controls the shared PlayerContext state.
const MiniPlayer = () => {
  const { currentSong, isPlaying, setIsPlaying, playNext, setIsNowPlayingOpen, currentTime, duration } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();

  if (!currentSong) return null;

  const progressPct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed inset-x-2 bottom-[64px] z-40 overflow-hidden rounded-2xl border border-white/10 bg-[#141415]/97 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:hidden">
      {/* Progress bar at top */}
      <div className="h-0.5 w-full bg-white/10">
        <div
          className="h-full bg-amber-400 transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setIsNowPlayingOpen(true)}
        aria-label="Open Now Playing"
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <img
          src={currentSong.thumbnail_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{currentSong.title}</p>
          <p className="truncate text-xs text-white/45">{currentSong.artist}</p>
        </div>

        {/* Like */}
        <span
          role="button"
          aria-label={isLiked(currentSong) ? "Unlike" : "Like"}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(currentSong);
          }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition ${
            isLiked(currentSong) ? "text-amber-400" : "text-white/40"
          }`}
        >
          {isLiked(currentSong) ? <IoMdHeart /> : <IoMdHeartEmpty />}
        </span>

        {/* Play / Pause */}
        <span
          role="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying(!isPlaying);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-md shadow-amber-500/30"
        >
          {isPlaying ? <IoPause /> : <IoPlay className="translate-x-0.5" />}
        </span>

        {/* Next */}
        <span
          role="button"
          aria-label="Next"
          onClick={(e) => {
            e.stopPropagation();
            playNext();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60"
        >
          <IoPlaySkipForward />
        </span>
      </button>
    </div>
  );
};

export default MiniPlayer;
