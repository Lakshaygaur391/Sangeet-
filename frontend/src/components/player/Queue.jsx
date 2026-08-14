import { IoClose, IoTrashOutline, IoRemoveCircleOutline } from "react-icons/io5";
import { usePlayer } from "../../context/PlayerContext";
import { normalizeSong, songId } from "../../lib/media";
import { EmptyState } from "../ui/StatePanels";

const Queue = () => {
  const { isQueueOpen, setIsQueueOpen, songList, currentIndex, playAt, removeFromQueue, clearQueue, currentSong } =
    usePlayer();

  if (!isQueueOpen) return null;

  const upcoming = songList.slice(currentIndex + 1);

  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setIsQueueOpen(false)}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#101010] p-4 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h2 text-white">Queue</h2>
          <button type="button" aria-label="Close queue" onClick={() => setIsQueueOpen(false)} className="text-white/60 hover:text-white">
            <IoClose className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentSong && (
            <div className="mb-5">
              <p className="text-meta mb-2">Now Playing</p>
              <div className="flex items-center gap-3 rounded-xl bg-amber-400/10 px-3 py-2.5">
                <img src={currentSong.thumbnail_url} alt="" className="h-11 w-11 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-amber-200">{currentSong.title}</p>
                  <p className="truncate text-xs text-white/45">{currentSong.artist}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <p className="text-meta">Next Up ({upcoming.length})</p>
            {upcoming.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="flex items-center gap-1 text-xs font-medium text-white/40 hover:text-rose-300"
              >
                <IoTrashOutline /> Clear
              </button>
            )}
          </div>

          {upcoming.length === 0 ? (
            <EmptyState title="Queue is empty" description="Songs you play next will show up here." />
          ) : (
            <div className="space-y-1">
              {upcoming.map((rawSong, i) => {
                const song = normalizeSong(rawSong);
                const realIndex = currentIndex + 1 + i;
                return (
                  <div key={`${songId(song)}-${realIndex}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                    <button type="button" onClick={() => playAt(realIndex)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <img src={song.thumbnail_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{song.title}</p>
                        <p className="truncate text-xs text-white/40">{song.artist}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${song.title} from queue`}
                      onClick={() => removeFromQueue(realIndex)}
                      className="text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-rose-300"
                    >
                      <IoRemoveCircleOutline className="text-lg" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Queue;
