import { useEffect, useMemo } from "react";
import { IoChevronDown, IoPlay, IoPause, IoPlaySkipBack, IoPlaySkipForward, IoShuffle, IoRepeat, IoListOutline } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { formatTime, normalizeSong, songId } from "../../lib/media";
import SongRow from "../song/SongRow";
import QueuePanel from "./Queue";

const NowPlaying = () => {
  const {
    isNowPlayingOpen, setIsNowPlayingOpen, currentSong, isPlaying, setIsPlaying,
    playNext, playPrevious, shuffle, setShuffle, repeatMode, cycleRepeat, setIsQueueOpen,
    currentTime, duration, seekTo, songList,
  } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();

  useEffect(() => {
    if (!isNowPlayingOpen) return;
    const handleKey = (e) => e.key === "Escape" && setIsNowPlayingOpen(false);
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isNowPlayingOpen, setIsNowPlayingOpen]);

  // Real "you might also like" — same artist first, then same language,
  // pulled straight from the already-loaded catalog (no fake/static rows).
  const related = useMemo(() => {
    if (!currentSong || !songList.length) return [];
    const pool = songList.map(normalizeSong).filter((s) => songId(s) !== songId(currentSong));
    const sameArtist = pool.filter((s) => s.artist === currentSong.artist);
    const sameLanguage = pool.filter((s) => s.language && s.language === currentSong.language && s.artist !== currentSong.artist);
    const rest = pool.filter((s) => s.artist !== currentSong.artist && s.language !== currentSong.language);
    return [...sameArtist, ...sameLanguage, ...rest].slice(0, 8);
  }, [currentSong, songList]);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  if (!isNowPlayingOpen || !currentSong) return null;

  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPct = duration ? Math.min(100, (displayTime / duration) * 100) : 0;

  const handleSliderStart = (e) => {
    setIsScrubbing(true);
    setScrubTime(Number(e.target.value));
  };

  const handleSliderChange = (e) => {
    setScrubTime(Number(e.target.value));
  };

  const handleSliderEnd = (e) => {
    const val = Number(e.target.value);
    setIsScrubbing(false);
    seekTo(val);
  };

  const skipSeconds = (delta) => {
    const target = Math.max(0, Math.min(duration || 0, currentTime + delta));
    seekTo(target);
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-[85] overflow-y-auto text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="h-full w-full scale-125"
          style={{
            backgroundImage: `url(${currentSong.thumbnail_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(60px) saturate(140%) brightness(0.35)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,74,0.10),transparent_55%)]" />
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 py-8 lg:max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            aria-label="Minimize Now Playing"
            onClick={() => setIsNowPlayingOpen(false)}
            className="rounded-full p-2 text-white/70 transition hover:bg-white/10"
          >
            <IoChevronDown className="text-2xl" />
          </button>
          <p className="text-meta">Now Playing</p>
          <span className="w-9" aria-hidden="true" />
        </div>

        {/* Desktop: artwork/controls on the left, queue on right */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12">
          <div className="mx-auto flex w-full max-w-md flex-col lg:mx-0 lg:max-w-none">
            <div className="mx-auto mb-10 w-full max-w-sm sm:max-w-md">
              <img
                src={currentSong.thumbnail_url}
                alt=""
                className="aspect-square w-full rounded-2xl object-cover shadow-[0_50px_120px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
              />
            </div>

            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{currentSong.title}</h1>
                <p className="text-body mt-1.5 truncate text-white/55">{currentSong.artist}</p>
              </div>
              <button
                type="button"
                aria-label={isLiked(currentSong) ? "Unlike song" : "Like song"}
                onClick={() => toggleLike(currentSong)}
                className="shrink-0 pt-1 text-2xl text-white/60 transition hover:scale-110 hover:text-amber-300"
              >
                {isLiked(currentSong) ? <IoMdHeart className="text-amber-400" /> : <IoMdHeartEmpty />}
              </button>
            </div>

            {/* Seekbar */}
            <div className="relative">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={Math.min(displayTime, duration || 100)}
                onMouseDown={handleSliderStart}
                onTouchStart={handleSliderStart}
                onChange={handleSliderChange}
                onMouseUp={handleSliderEnd}
                onTouchEnd={handleSliderEnd}
                aria-label="Seek track"
                className="relative z-10 h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent accent-amber-400"
                style={{
                  background: `linear-gradient(to right, #eab34a ${progressPct}%, rgba(255,255,255,0.15) ${progressPct}%)`,
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-white/40">
              <span>{formatTime(displayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-center gap-4 sm:gap-6 text-2xl">
              <button
                type="button"
                aria-label="Toggle shuffle"
                aria-pressed={shuffle}
                onClick={() => setShuffle((v) => !v)}
                className={`rounded-full p-2 transition hover:bg-white/10 ${shuffle ? "text-amber-300" : "text-white/50"}`}
              >
                <IoShuffle className="text-lg" />
              </button>

              <button type="button" aria-label="Previous" onClick={playPrevious} className="rounded-full p-2 text-white transition hover:bg-white/10">
                <IoPlaySkipBack />
              </button>

              {/* Rewind 10s */}
              <button
                type="button"
                aria-label="Rewind 10 seconds"
                onClick={() => skipSeconds(-10)}
                className="rounded-full border border-white/10 p-1.5 text-xs font-bold text-white/50 transition hover:bg-white/10 hover:text-white"
                title="Rewind 10s"
              >
                -10s
              </button>

              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-black shadow-[0_10px_30px_rgba(234,179,74,0.35)] transition hover:scale-105 hover:bg-amber-300"
              >
                {isPlaying ? <IoPause className="text-2xl" /> : <IoPlay className="translate-x-0.5 text-2xl" />}
              </button>

              {/* Forward 10s */}
              <button
                type="button"
                aria-label="Forward 10 seconds"
                onClick={() => skipSeconds(10)}
                className="rounded-full border border-white/10 p-1.5 text-xs font-bold text-white/50 transition hover:bg-white/10 hover:text-white"
                title="Forward 10s"
              >
                +10s
              </button>

              <button type="button" aria-label="Next" onClick={playNext} className="rounded-full p-2 text-white transition hover:bg-white/10">
                <IoPlaySkipForward />
              </button>

              <button
                type="button"
                aria-label={`Repeat: ${repeatMode}`}
                aria-pressed={repeatMode !== "off"}
                onClick={cycleRepeat}
                className={`relative rounded-full p-2 transition hover:bg-white/10 ${repeatMode !== "off" ? "text-amber-300" : "text-white/50"}`}
              >
                <IoRepeat className="text-lg" />
                {repeatMode === "one" && (
                  <span className="absolute -top-0.5 right-0 rounded-full bg-amber-400 px-1 text-[8px] font-bold text-black">1</span>
                )}
              </button>
            </div>

            {/* Queue button — only needed where the queue isn't already
                visible inline (below lg). */}
            <div className="mt-5 flex items-center justify-center lg:hidden">
              <button
                type="button"
                aria-label="Open queue"
                onClick={() => setIsQueueOpen(true)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <IoListOutline className="text-base" /> Queue
              </button>
            </div>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
              <p className="text-meta mb-1">Lyrics</p>
              <p className="text-body text-white/45">Lyrics aren't available for this track yet.</p>
            </div>

            {related.length > 0 && (
              <div className="mb-10 mt-8">
                <h2 className="text-h2 mb-2 px-1 text-white">You might also like</h2>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
                  {related.map((song, i) => (
                    <SongRow key={songId(song)} song={song} queue={related} index={i} showIndex={false} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline queue column — desktop only */}
          <div className="sticky top-8 mb-10 hidden max-h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm lg:block">
            <h2 className="text-h2 mb-4 text-white">Queue</h2>
            <QueuePanel compact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;