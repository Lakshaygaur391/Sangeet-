import { IoPlay, IoPause, IoPlaySkipForward } from "react-icons/io5";
import { usePlayer } from "../../context/PlayerContext";

// Mobile-only compact player. The actual YouTube audio engine lives in
// <Player /> (rendered but visually hidden below md), this just reflects
// and controls the shared PlayerContext state.
const MiniPlayer = () => {
  const { currentSong, isPlaying, setIsPlaying, playNext, setIsNowPlayingOpen } = usePlayer();

  if (!currentSong) return null;

  return (
    <button
      type="button"
      onClick={() => setIsNowPlayingOpen(true)}
      aria-label="Open Now Playing"
      className="fixed inset-x-2 bottom-[64px] z-40 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#161616]/97 p-2 text-left shadow-[0_-8px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl md:hidden"
    >
      <img src={currentSong.thumbnail_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{currentSong.title}</p>
        <p className="truncate text-xs text-white/45">{currentSong.artist}</p>
      </div>
      <span
        role="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={(e) => {
          e.stopPropagation();
          setIsPlaying(!isPlaying);
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-black"
      >
        {isPlaying ? <IoPause /> : <IoPlay className="translate-x-0.5" />}
      </span>
      <span
        role="button"
        aria-label="Next"
        onClick={(e) => {
          e.stopPropagation();
          playNext();
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70"
      >
        <IoPlaySkipForward />
      </span>
    </button>
  );
};

export default MiniPlayer;
