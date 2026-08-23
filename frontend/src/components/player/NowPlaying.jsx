import { useEffect, useMemo, useState } from "react";
import {
  IoChevronDown,
  IoPlay,
  IoPause,
  IoPlaySkipBack,
  IoPlaySkipForward,
  IoShuffle,
  IoRepeat,
  IoListOutline,
  IoAddOutline,
  IoVolumeHigh,
  IoVolumeMute,
} from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useUI } from "../../context/UIContext";
import { formatTime, normalizeSong, songId } from "../../lib/media";
import QueuePanel from "./Queue";

const NowPlaying = () => {
  const {
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    currentSong,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    shuffle,
    setShuffle,
    repeatMode,
    cycleRepeat,
    setIsQueueOpen,
    currentTime,
    duration,
    seekTo,
    songList,
    setSongList,
    playSong,
    volume,
    setVolume,
  } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { toast } = useUI();
  const [activeTab, setActiveTab] = useState("queue"); // 'queue' | 'related'
  const [prevVolume, setPrevVolume] = useState(100);

  // Global keyboard shortcuts for Now Playing overlay
  useEffect(() => {
    if (!isNowPlayingOpen) return;

    const handleKey = (e) => {
      // Don't intercept if typing in an input
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

      if (e.key === "Escape") {
        setIsNowPlayingOpen(false);
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekTo(Math.min(duration, currentTime + 5));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 5));
      }
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isNowPlayingOpen, setIsNowPlayingOpen, isPlaying, setIsPlaying, currentTime, duration, seekTo]);

  // Real "you might also like" — same artist first, then same language
  const related = useMemo(() => {
    if (!currentSong || !songList.length) return [];
    const pool = songList.map(normalizeSong).filter((s) => songId(s) !== songId(currentSong));
    const sameArtist = pool.filter((s) => s.artist === currentSong.artist);
    const sameLanguage = pool.filter(
      (s) => s.language && s.language === currentSong.language && s.artist !== currentSong.artist
    );
    const rest = pool.filter(
      (s) => s.artist !== currentSong.artist && s.language !== currentSong.language
    );
    return [...sameArtist, ...sameLanguage, ...rest].slice(0, 16);
  }, [currentSong, songList]);

  const addRelatedToQueue = (song) => {
    setSongList((prev) => [...prev, song]);
    toast(`Added "${song.title}" to Queue`, "success");
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 60);
    }
  };

  if (!currentSong) return null;

  const progressPct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      aria-hidden={!isNowPlayingOpen}
      className={`fixed inset-0 z-[85] flex flex-col justify-between overflow-y-auto bg-[#070709] text-white select-none lg:overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-transform ${
        isNowPlayingOpen
          ? "opacity-100 translate-y-0 pointer-events-auto visible"
          : "opacity-0 translate-y-8 pointer-events-none invisible"
      }`}
    >
      {/* ── Ambient Fluid Background (Hardware-accelerated) ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
          className="h-full w-full scale-110 transform-gpu transition-all duration-500 will-change-transform"
          style={{
            backgroundImage: `url(${currentSong.thumbnail_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(48px) saturate(150%) brightness(0.22)",
            transform: "translateZ(0)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[#070709]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(234,179,74,0.12),_transparent_60%)]" />
      </div>

      {/* ── Top Header Navigation Bar ── */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between px-5 md:px-8 border-b border-white/[0.05]">
        <button
          type="button"
          aria-label="Minimize Now Playing"
          onClick={() => setIsNowPlayingOpen(false)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/15 hover:text-white active:scale-90"
          title="Minimize (Esc)"
        >
          <IoChevronDown className="text-2xl" />
        </button>

        <div className="text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/40">Playing From</p>
          <p className="text-xs font-bold text-amber-300/90 truncate max-w-[200px] sm:max-w-[300px]">
            {currentSong.album || currentSong.language || "Sangeet Stream"}
          </p>
        </div>

        {/* Volume slider (desktop header) */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={toggleMute}
            className="text-white/50 hover:text-white transition p-1"
          >
            {volume === 0 ? <IoVolumeMute className="text-lg text-rose-400" /> : <IoVolumeHigh className="text-lg" />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-20 cursor-pointer"
            style={{
              background: `linear-gradient(to right, #eab34a ${volume}%, rgba(255,255,255,0.12) ${volume}%)`,
            }}
          />
        </div>
      </header>

      {/* ── Main Viewport Content: Left Player, Right Queue & Mix ── */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-4 md:px-8 lg:grid lg:grid-cols-[minmax(0,1.1fr)_400px] lg:gap-12 lg:items-center lg:py-6">
        
        {/* ── LEFT COLUMN: Artwork + Metadata + Controls (Always in view) ── */}
        <div className="mx-auto flex w-full max-w-md flex-col justify-center lg:mx-0 lg:max-w-none">
          {/* Album Artwork Card */}
          <div className="relative mx-auto mb-5 w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[380px]">
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
              <img
                src={currentSong.thumbnail_url}
                alt=""
                className="h-full w-full object-cover transform-gpu transition-transform duration-500 hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
            </div>

            {/* Glowing Aura below album */}
            {isPlaying && (
              <div
                className="pointer-events-none absolute -inset-4 -z-10 rounded-full opacity-40 blur-2xl transition-opacity"
                style={{
                  background: "radial-gradient(circle, rgba(234,179,74,0.3) 0%, transparent 70%)",
                }}
              />
            )}
          </div>

          {/* Track Info + Like Button */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1
                className="truncate text-xl font-black tracking-tight text-white sm:text-2xl lg:text-3xl"
                title={currentSong.title}
              >
                {currentSong.title}
              </h1>
              <p className="truncate text-xs font-semibold text-white/55 sm:text-sm mt-0.5" title={currentSong.artist}>
                {currentSong.artist}
              </p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {currentSong.language && (
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
                    {currentSong.language}
                  </span>
                )}
                {currentSong.album && (
                  <span className="truncate text-[11px] text-white/35 max-w-[200px]">
                    {currentSong.album}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              aria-label={isLiked(currentSong) ? "Unlike song" : "Like song"}
              onClick={() => toggleLike(currentSong)}
              className={`shrink-0 rounded-full p-2 text-2xl transition-all duration-200 hover:scale-110 active:scale-90 ${
                isLiked(currentSong) ? "text-amber-400" : "text-white/40 hover:text-amber-300"
              }`}
            >
              {isLiked(currentSong) ? <IoMdHeart /> : <IoMdHeartEmpty />}
            </button>
          </div>

          {/* Progress / Seekbar */}
          <div className="space-y-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || 0)}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Seek track"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-transparent"
                style={{
                  background: `linear-gradient(to right, #eab34a ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium tabular-nums text-white/40 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport Controls (Play/Pause/Skip/Shuffle) */}
          <div className="mt-3 flex items-center justify-center gap-4 sm:gap-6 text-xl sm:text-2xl">
            <button
              type="button"
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
              onClick={() => setShuffle((v) => !v)}
              className={`rounded-full p-2.5 transition hover:bg-white/10 ${
                shuffle ? "text-amber-300" : "text-white/40 hover:text-white"
              }`}
              title="Shuffle"
            >
              <IoShuffle className="text-lg sm:text-xl" />
            </button>

            <button
              type="button"
              aria-label="Previous track"
              onClick={playPrevious}
              className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white active:scale-90"
              title="Previous"
            >
              <IoPlaySkipBack className="text-xl sm:text-2xl" />
            </button>

            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-[0_8px_30px_rgba(234,179,74,0.4)] transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgba(234,179,74,0.55)] active:scale-95"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <IoPause className="text-2xl sm:text-3xl" />
              ) : (
                <IoPlay className="translate-x-0.5 text-2xl sm:text-3xl" />
              )}
            </button>

            <button
              type="button"
              aria-label="Next track"
              onClick={playNext}
              className="rounded-full p-2.5 text-white/80 transition hover:bg-white/10 hover:text-white active:scale-90"
              title="Next"
            >
              <IoPlaySkipForward className="text-xl sm:text-2xl" />
            </button>

            <button
              type="button"
              aria-label={`Repeat: ${repeatMode}`}
              aria-pressed={repeatMode !== "off"}
              onClick={cycleRepeat}
              className={`relative rounded-full p-2.5 transition hover:bg-white/10 ${
                repeatMode !== "off" ? "text-amber-300" : "text-white/40 hover:text-white"
              }`}
              title="Repeat"
            >
              <IoRepeat className="text-lg sm:text-xl" />
              {repeatMode === "one" && (
                <span className="absolute -top-0.5 right-0 rounded-full bg-amber-400 px-1 text-[8px] font-bold text-black leading-none py-0.5">
                  1
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Desktop Queue & Mix Sidebar ── */}
        <div className="hidden h-[calc(100vh-10rem)] max-h-[580px] flex-col rounded-3xl border border-white/[0.08] bg-[#111114]/90 p-4 shadow-2xl backdrop-blur-xl lg:flex">
          {/* Header Tabs: Queue vs Recommendations */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "queue"
                  ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <IoListOutline className="text-sm" /> Up Next ({songList.length})
            </button>

            {related.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("related")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "related"
                    ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                    : "text-white/50 hover:text-white"
                }`}
              >
                <span>Recommended ({related.length})</span>
              </button>
            )}
          </div>

          {/* Tab Content: Queue */}
          {activeTab === "queue" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <QueuePanel compact />
            </div>
          )}

          {/* Tab Content: Recommended */}
          {activeTab === "related" && (
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-none">
              {related.map((song, i) => (
                <div
                  key={songId(song) || i}
                  className="group flex items-center justify-between gap-3 rounded-xl p-2 transition hover:bg-white/[0.06]"
                >
                  <button
                    type="button"
                    onClick={() => playSong(song, related, i)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                      <img src={song.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <IoPlay className="text-sm text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white group-hover:text-amber-300">
                        {song.title}
                      </p>
                      <p className="truncate text-[11px] text-white/45">{song.artist}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => addRelatedToQueue(song)}
                      title="Add to queue"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-amber-300 transition"
                    >
                      <IoAddOutline className="text-base" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile Queue Trigger Button ── */}
      <div className="relative z-20 flex items-center justify-center pb-6 lg:hidden">
        <button
          type="button"
          onClick={() => setIsQueueOpen(true)}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-5 py-2.5 text-xs font-bold text-white/80 shadow-lg backdrop-blur-md transition hover:bg-white/15 hover:text-white"
        >
          <IoListOutline className="text-base text-amber-400" />
          <span>View Up Next Queue ({songList.length})</span>
        </button>
      </div>
    </div>
  );
};

export default NowPlaying;