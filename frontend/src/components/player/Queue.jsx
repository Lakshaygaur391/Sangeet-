import { useState } from "react";
import {
  IoClose,
  IoTrashOutline,
  IoRemoveCircleOutline,
  IoArrowUp,
  IoArrowDown,
  IoPlay,
  IoReorderTwo,
} from "react-icons/io5";
import { usePlayer } from "../../context/PlayerContext";
import { normalizeSong, songId, formatTime } from "../../lib/media";
import { EmptyState } from "../ui/StatePanels";

// Queue panel — used both as an overlay drawer and inline in NowPlaying on desktop.
const Queue = ({ compact = false }) => {
  const {
    isQueueOpen,
    setIsQueueOpen,
    songList,
    currentIndex,
    playAt,
    removeFromQueue,
    clearQueue,
    moveQueueItem,
    currentSong,
  } = usePlayer();

  // Track which row has reorder expanded (for mobile tap)
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!compact && !isQueueOpen) return null;

  const upcoming = songList.slice(currentIndex + 1);

  const moveUp = (realIndex) => {
    if (realIndex <= currentIndex + 1) return;
    moveQueueItem(realIndex, realIndex - 1);
  };

  const moveDown = (realIndex) => {
    if (realIndex >= songList.length - 1) return;
    moveQueueItem(realIndex, realIndex + 1);
  };

  const toggleExpanded = (realIndex) => {
    setExpandedIndex((prev) => (prev === realIndex ? null : realIndex));
  };

  const content = (
    <div
      className="flex-1 overflow-y-auto space-y-0.5"
      style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
    >
      {/* Now Playing */}
      {currentSong && (
        <div className="mb-4">
          <p className="text-meta mb-2 px-1">Now Playing</p>
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2.5">
            <img
              src={currentSong.thumbnail_url}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-amber-200">{currentSong.title}</p>
              <p className="mt-0.5 truncate text-xs text-white/45">{currentSong.artist}</p>
            </div>
            {/* EQ bars */}
            <span className="eq-bars shrink-0">
              <span /><span /><span />
            </span>
          </div>
        </div>
      )}

      {/* Up Next header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-meta">Up Next ({upcoming.length})</p>
        {upcoming.length > 0 && (
          <button
            type="button"
            onClick={clearQueue}
            className="flex items-center gap-1 text-xs font-medium text-white/35 transition-colors hover:text-rose-300"
          >
            <IoTrashOutline className="text-xs" /> Clear
          </button>
        )}
      </div>

      {/* Song list */}
      {upcoming.length === 0 ? (
        <EmptyState title="Queue is empty" description="Songs you add or play next will appear here." />
      ) : (
        <div className="space-y-0.5">
          {upcoming.map((rawSong, i) => {
            const song = normalizeSong(rawSong);
            const realIndex = currentIndex + 1 + i;
            const canMoveUp = i > 0;
            const canMoveDown = i < upcoming.length - 1;
            const isExpanded = expandedIndex === realIndex;

            return (
              <div
                key={`${songId(song)}-${realIndex}`}
                className="group rounded-xl transition-colors duration-100 hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-2 px-2 py-2">
                  {/* Thumbnail + song info — clicking plays */}
                  <button
                    type="button"
                    onClick={() => playAt(realIndex)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                      <img src={song.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                        <IoPlay className="translate-x-[1px] text-xs text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium leading-tight text-white group-hover:text-amber-200">
                        {song.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] leading-tight text-white/40">
                        {song.artist}
                      </p>
                    </div>
                  </button>

                  {/* Duration */}
                  {song.duration && (
                    <span className="hidden shrink-0 text-[11px] tabular-nums text-white/25 sm:inline">
                      {formatTime(song.duration)}
                    </span>
                  )}

                  {/* ── DESKTOP: Up/Down/Remove appear only on hover ── */}
                  <div className="hidden shrink-0 items-center gap-0.5 md:flex opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => moveUp(realIndex)}
                      disabled={!canMoveUp}
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-100 ${
                        canMoveUp
                          ? "text-white/50 hover:bg-white/10 hover:text-white"
                          : "cursor-not-allowed text-white/[0.12]"
                      }`}
                    >
                      <IoArrowUp className="text-[11px]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => moveDown(realIndex)}
                      disabled={!canMoveDown}
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-100 ${
                        canMoveDown
                          ? "text-white/50 hover:bg-white/10 hover:text-white"
                          : "cursor-not-allowed text-white/[0.12]"
                      }`}
                    >
                      <IoArrowDown className="text-[11px]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Remove from queue"
                      onClick={() => removeFromQueue(realIndex)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition-colors duration-100 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <IoRemoveCircleOutline className="text-[13px]" />
                    </button>
                  </div>

                  {/* ── MOBILE: Reorder handle (tap to expand) ── */}
                  <button
                    type="button"
                    aria-label="Reorder options"
                    onClick={() => toggleExpanded(realIndex)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-100 md:hidden ${
                      isExpanded ? "bg-white/10 text-white" : "text-white/30"
                    }`}
                  >
                    <IoReorderTwo className="text-base" />
                  </button>
                </div>

                {/* ── MOBILE expanded row: Up / Down / Remove ── */}
                {isExpanded && (
                  <div className="flex items-center gap-2 border-t border-white/[0.05] px-3 pb-2 pt-1.5 md:hidden">
                    <button
                      type="button"
                      onClick={() => { moveUp(realIndex); setExpandedIndex(null); }}
                      disabled={!canMoveUp}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        canMoveUp
                          ? "bg-white/[0.06] text-white/70 hover:bg-white/10"
                          : "cursor-not-allowed bg-white/[0.03] text-white/20"
                      }`}
                    >
                      <IoArrowUp className="text-[11px]" /> Move Up
                    </button>
                    <button
                      type="button"
                      onClick={() => { moveDown(realIndex); setExpandedIndex(null); }}
                      disabled={!canMoveDown}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        canMoveDown
                          ? "bg-white/[0.06] text-white/70 hover:bg-white/10"
                          : "cursor-not-allowed bg-white/[0.03] text-white/20"
                      }`}
                    >
                      <IoArrowDown className="text-[11px]" /> Move Down
                    </button>
                    <button
                      type="button"
                      onClick={() => { removeFromQueue(realIndex); setExpandedIndex(null); }}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                    >
                      <IoRemoveCircleOutline className="text-sm" /> Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Compact mode: just the content (for NowPlaying desktop inline)
  if (compact) return content;

  // Drawer mode: full overlay
  return (
    <div
      className="fixed inset-0 z-[95] flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={() => setIsQueueOpen(false)}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-in-right flex h-full w-full max-w-sm flex-col border-l border-white/[0.07] bg-[#0e0e0f] p-4 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h2 text-white">Queue</h2>
          <button
            type="button"
            aria-label="Close queue"
            onClick={() => setIsQueueOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IoClose className="text-xl" />
          </button>
        </div>
        {content}
      </aside>
    </div>
  );
};

export default Queue;
