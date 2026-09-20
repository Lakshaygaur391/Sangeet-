import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoPlay, IoMusicalNotes, IoHeart, IoDiscOutline, IoEllipsisHorizontal } from "react-icons/io5";
import { usePlayer } from "../../context/PlayerContext";
import playlistService from "../../services/playlistService";
import MediaOptionsMenu from "../ui/MediaOptionsMenu";

const PlaylistCard = memo(({ playlist, onPlayAll }) => {
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!playlist) return null;

  const id = playlist.id || playlist._id;
  const isYearly = playlist.isYearly || id?.startsWith("year-") || /^\d{4}$/.test(playlist.name);
  const isLiked = id === "liked" || playlist.name === "Liked Songs";
  const songCount = playlist.songCount ?? (playlist.songs || []).length;
  const coverImage =
    !imgError &&
    (playlist.coverImage ||
      playlist.songs?.[0]?.thumbnail_url ||
      (Array.isArray(playlist.collage) && playlist.collage[0]) ||
      "");
  const year = isYearly ? (playlist.year || parseInt(playlist.name, 10) || null) : null;

  const handlePlayClick = async (e) => {
    e.stopPropagation();
    if (onPlayAll) {
      onPlayAll(playlist);
      return;
    }
    if (Array.isArray(playlist.songs) && playlist.songs.length > 0) {
      playSong(playlist.songs[0], playlist.songs, 0);
      return;
    }
    if (isYearly) {
      try {
        const y = playlist.year || parseInt(playlist.name, 10);
        const res = await playlistService.getYear(y);
        if (res?.songs?.length > 0) {
          playSong(res.songs[0], res.songs, 0);
          return;
        }
      } catch (err) {
        console.error("Play yearly failed:", err);
      }
    }
    navigate(`/playlist/${id}`);
  };

  const typeAccent = isLiked
    ? "from-rose-500/20 via-rose-900/10 to-transparent border-rose-500/20"
    : isYearly
    ? "from-amber-500/20 via-amber-900/10 to-transparent border-amber-500/20"
    : "from-white/[0.06] to-transparent border-white/[0.06]";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open playlist: ${playlist.name || playlist.title}`}
      onClick={() => navigate(`/playlist/${id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/playlist/${id}`)}
      className={`group relative flex flex-col w-full cursor-pointer rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#111113] p-2 sm:p-2.5 text-left text-white shadow-md shadow-black/40 transition-all duration-250 hover:-translate-y-1 hover:border-amber-400/30 hover:shadow-xl hover:shadow-amber-500/10 hover:bg-[#161619] ${
        menuOpen ? "z-40" : "z-10"
      }`}
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full rounded-lg sm:rounded-xl bg-white/[0.03]">
        <div className="relative h-full w-full overflow-hidden rounded-lg sm:rounded-xl">
          {coverImage ? (
            <img
              src={coverImage}
              alt={playlist.name || playlist.title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
          ) : isYearly ? (
            /* High-end Collector Vinyl Artwork */
            <div className="vinyl-disc vinyl-grooves relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg sm:rounded-xl border border-amber-500/20 p-3 text-center transition-transform duration-500 group-hover:scale-[1.03]">
              <div className="vinyl-sheen pointer-events-none absolute inset-0" />
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-br from-amber-400/25 via-[#181614] to-black shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_0_15px_rgba(245,158,11,0.15)]">
                {/* Spindle hole */}
                <div className="absolute h-3 w-3 rounded-full border border-amber-400/50 bg-[#0c0c0e]" />
                <span className="text-xl sm:text-2xl font-black tracking-tight text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {playlist.name}
                </span>
              </div>
            </div>
          ) : (
            <div
              className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${typeAccent} p-3 text-center transition-transform duration-300 group-hover:scale-[1.04]`}
            >
              {isLiked ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/20">
                    <IoHeart className="text-2xl" />
                  </div>
                  <span className="text-[11px] font-bold text-rose-200">Liked Songs</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-white/40">
                  <IoMusicalNotes className="text-3xl text-amber-400/60" />
                  <span className="text-[11px] font-semibold">{playlist.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Hover dark gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>

        {/* Top-right More Options button — hidden on mobile, hover on desktop */}
        <div
          className={`absolute top-1.5 right-1.5 z-30 hidden sm:block transition-all duration-200 ${
            menuOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="relative">
            <button
              type="button"
              aria-label="More playlist options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white/80 transition-all duration-200 hover:bg-black/85 hover:text-white hover:scale-110 active:scale-95 shadow-md"
            >
              <IoEllipsisHorizontal className="text-xs" />
            </button>

            <MediaOptionsMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              playlist={playlist}
              itemType="playlist"
              align="right"
              position="bottom"
            />
          </div>
        </div>

        {/* Floating Play button — revealed on hover */}
        <button
          type="button"
          aria-label={`Play ${playlist.name}`}
          onClick={handlePlayClick}
          className="absolute bottom-2 right-2 z-20 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black opacity-0 shadow-xl shadow-black/60 transition-all duration-200 hover:scale-110 hover:shadow-amber-500/40 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
        >
          <IoPlay className="translate-x-0.5 text-base sm:text-lg" />
        </button>
      </div>

      {/* Playlist Details */}
      <div className="mt-2 sm:mt-2.5 flex flex-1 flex-col gap-0.5 min-w-0">
        <p className="truncate text-xs sm:text-sm font-bold text-white transition-colors duration-150 group-hover:text-amber-200 leading-snug">
          {playlist.name || playlist.title}
        </p>

        <p
          className="truncate text-[11px] leading-relaxed text-white/50"
          title={playlist.description}
        >
          {playlist.description ||
            (isYearly
              ? `${playlist.name} • 7 songs`
              : isLiked
              ? "Your saved music"
              : `${songCount} songs`)}
        </p>
      </div>
    </div>
  );
});

PlaylistCard.displayName = "PlaylistCard";
export default PlaylistCard;
