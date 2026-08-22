import { useNavigate } from "react-router-dom";
import { IoPlay, IoSparkles, IoMusicalNotes, IoHeart, IoTime } from "react-icons/io5";
import { usePlayer } from "../../context/PlayerContext";

/** Format seconds → "1 hr 20 min" or "45 min" */
function fmtDuration(sec = 0) {
  if (!sec || isNaN(sec)) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

/**
 * Detect a release year from a song's thumbnail / title using the same
 * heuristics as the backend extractReleaseYear — but lightweight client-side.
 */
function detectYear(song) {
  if (!song) return null;
  const thumb = String(song.thumbnail_url || "");
  const title = String(song.title || "");

  // 1. Filename pattern: -Hindi-2026-, -2016-, _2024_
  const fnMatch = thumb.match(/[-_](?:[A-Za-z]+[-_])?(20\d{2})[-_]/);
  if (fnMatch) return parseInt(fnMatch[1], 10);

  // 2. Title: (2026) or [2026]
  const titleMatch = title.match(/[\(\[\s](20\d{2})[\)\]\s]/);
  if (titleMatch) return parseInt(titleMatch[1], 10);

  // 3. Any 20xx in URL
  const anyMatch = thumb.match(/(20\d{2})/);
  if (anyMatch) return parseInt(anyMatch[1], 10);

  return null;
}

const PlaylistCard = ({ playlist, onPlayAll }) => {
  const navigate = useNavigate();
  const { playSong } = usePlayer();

  if (!playlist) return null;

  const id = playlist.id || playlist._id;
  const isYearly = playlist.isYearly || id?.startsWith("year-") || /^\d{4}$/.test(playlist.name);
  const isLiked = id === "liked" || playlist.name === "Liked Songs";
  const songCount = playlist.songCount ?? (playlist.songs || []).length;
  const collage =
    Array.isArray(playlist.collage) && playlist.collage.length >= 4
      ? playlist.collage
      : null;
  const coverImage =
    playlist.coverImage ||
    (!collage && (playlist.songs?.[0]?.thumbnail_url || ""));
  const duration = fmtDuration(playlist.totalDuration);
  const year = isYearly ? (playlist.year || parseInt(playlist.name, 10) || null) : null;

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (onPlayAll) {
      onPlayAll(playlist);
      return;
    }
    if (Array.isArray(playlist.songs) && playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist.songs, 0);
    } else {
      navigate(`/playlist/${id}`);
    }
  };

  // Accent style per playlist type
  const typeAccent = isLiked
    ? "from-rose-500/20 to-rose-700/10 border-rose-500/20"
    : isYearly
    ? "from-amber-500/20 to-amber-700/10 border-amber-500/20"
    : "from-white/[0.06] to-transparent border-white/[0.06]";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open playlist: ${playlist.name || playlist.title}`}
      onClick={() => navigate(`/playlist/${id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/playlist/${id}`)}
      className="group relative flex flex-col w-full cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111112] p-3 text-left text-white shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.18] hover:shadow-2xl hover:shadow-black/50 hover:bg-[#161618]"
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white/[0.04]">
        {collage ? (
          /* 4-Quadrant Visual Collage */
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
            {collage.slice(0, 4).map((imgUrl, i) => (
              <img
                key={i}
                src={imgUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ))}
          </div>
        ) : coverImage ? (
          /* Single Cover Image */
          <img
            src={coverImage}
            alt={playlist.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
          />
        ) : (
          /* Gradient Fallback */
          <div
            className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${typeAccent} p-4 text-center transition-transform duration-300 group-hover:scale-[1.04]`}
          >
            {isLiked ? (
              <IoHeart className="text-3xl sm:text-4xl text-rose-400" />
            ) : isYearly ? (
              <>
                <span className="text-4xl sm:text-5xl font-black tracking-tighter text-amber-300 leading-none">
                  {playlist.name}
                </span>
                <IoSparkles className="mt-2 text-amber-400/60 text-sm" />
              </>
            ) : (
              <IoMusicalNotes className="text-3xl sm:text-4xl text-white/30" />
            )}
          </div>
        )}

        {/* Hover dark gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {/* Floating Play button — revealed on hover */}
        <button
          type="button"
          aria-label={`Play ${playlist.name}`}
          onClick={handlePlayClick}
          className="absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black opacity-0 shadow-2xl shadow-black/60 transition-all duration-200 hover:scale-110 hover:shadow-amber-500/40 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
        >
          <IoPlay className="translate-x-0.5 text-xl" />
        </button>

        {/* Top-left type badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {isYearly && (
            <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
              <IoSparkles className="text-[9px]" /> {year || "Yearly"}
            </span>
          )}
          {isLiked && (
            <span className="flex items-center gap-1 rounded-full border border-rose-400/30 bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 backdrop-blur-md">
              <IoHeart className="text-[9px]" /> Liked
            </span>
          )}
        </div>
      </div>

      {/* Playlist Details */}
      <div className="mt-3 flex flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-bold text-white transition-colors duration-150 group-hover:text-amber-200 sm:text-[0.9375rem] leading-snug">
          {playlist.name || playlist.title}
        </p>

        <p
          className="line-clamp-2 text-[11px] leading-relaxed text-white/45"
          title={playlist.description}
        >
          {playlist.description ||
            (isYearly
              ? `Music released in ${playlist.name}`
              : isLiked
              ? "Your saved music"
              : "Playlist")}
        </p>

        {/* Footer meta row */}
        <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.05] pt-2 text-[11px] text-white/35">
          <span className="font-medium">
            {songCount} {songCount === 1 ? "song" : "songs"}
          </span>
          <div className="flex items-center gap-2">
            {duration && (
              <span className="flex items-center gap-0.5">
                <IoTime className="text-[10px]" /> {duration}
              </span>
            )}
            {!isYearly && !isLiked && (
              <span className="truncate max-w-[64px]">
                {playlist.owner || "You"}
              </span>
            )}
            {isYearly && (
              <span className="text-amber-400/60 font-semibold">Sangeet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistCard;
