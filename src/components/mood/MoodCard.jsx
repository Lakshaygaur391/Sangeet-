import { useState } from "react";
import { IoPlay, IoPause, IoFlame, IoSparkles, IoMusicalNotes } from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { songId } from "../../lib/media";

const MoodCard = ({ mood, songs, onAddToPlaylist }) => {
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const isMoodActive =
    currentSong && songs.some((s) => songId(s) === songId(currentSong));

  const handlePlayMood = () => {
    if (!songs.length) return;
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    if (isMoodActive) {
      setIsPlaying(!isPlaying);
      return;
    }
    playSong(songs[0], songs, 0);
  };

  const handlePlaySingle = (song, idx) => {
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    const isActive = currentSong && songId(currentSong) === songId(song);
    if (isActive) {
      setIsPlaying(!isPlaying);
      return;
    }
    playSong(song, songs, idx);
  };

  // Preview collage thumbnails from the first 4 songs
  const previewImages = songs.slice(0, 4).map((s) => s.thumbnail_url);

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[28px] border p-5 shadow-2xl transition-all duration-300 hover:shadow-3xl ${mood.borderClass} ${mood.bgClass}`}
    >
      {/* Ambient background glow effect */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${mood.glowClass} opacity-50`}
      />

      {/* Header Section */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* 4-Tile Mini Mosaic Collage */}
          <div className="grid h-14 w-14 shrink-0 grid-cols-2 overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-black/50">
            {previewImages.map((img, i) => (
              <img key={i} src={img} alt="" className="h-full w-full object-cover" />
            ))}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${mood.accentTextClass?.replace('text-', 'bg-') || 'bg-amber-400'}`} />
              <span className={`text-[10px] font-extrabold uppercase tracking-widest ${mood.accentTextClass}`}>
                Mood &amp; Moments
              </span>
            </div>
            <h3 className="text-lg font-black text-white sm:text-xl leading-tight mt-0.5">
              {mood.label}
            </h3>
            <p className="text-xs text-white/50 line-clamp-1 mt-0.5">
              {mood.description}
            </p>
          </div>
        </div>

        {/* Big Quick Play Button for the Mood */}
        <button
          type="button"
          onClick={handlePlayMood}
          aria-label={`Play ${mood.label} Mix`}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
            isMoodActive && isPlaying
              ? "bg-amber-400 text-black shadow-amber-400/30 ring-2 ring-amber-300"
              : `${mood.playBtnClass} text-black shadow-black/40`
          }`}
        >
          {isMoodActive && isPlaying ? (
            <IoPause className="text-xl" />
          ) : (
            <IoPlay className="text-xl translate-x-0.5" />
          )}
        </button>
      </div>

      {/* Track Rail */}
      <div className="relative z-10 mt-4">
        <div className="flex items-center justify-between pb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
          <span>Curated Mix ({songs.length} Tracks)</span>
          <span className="text-white/30">Swipe &rarr;</span>
        </div>

        <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 py-1">
          {songs.map((song, i) => {
            const isCurrent = currentSong && songId(currentSong) === songId(song);
            const liked = isLiked(song);

            return (
              <div
                key={`${song._id || song.title}-${i}`}
                className="group/item relative flex w-32 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141416]/80 p-2 shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-[#1a1a1e] sm:w-36"
              >
                {/* Artwork */}
                <div
                  onClick={() => handlePlaySingle(song, i)}
                  className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl bg-black/40"
                >
                  <img
                    src={song.thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/item:scale-105"
                  />

                  {/* Play Overlay */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-200 ${
                      isCurrent && isPlaying ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg">
                      {isCurrent && isPlaying ? (
                        <IoPause className="text-base" />
                      ) : (
                        <IoPlay className="text-base translate-x-0.5" />
                      )}
                    </span>
                  </div>

                  {/* Playing Equalizer */}
                  {isCurrent && isPlaying && (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center justify-center rounded-md bg-black/70 px-1.5 py-0.5">
                      <span className="eq-bars scale-75">
                        <span /><span /><span />
                      </span>
                    </span>
                  )}
                </div>

                {/* Info & Like Action */}
                <div className="mt-2 flex flex-col justify-between">
                  <p
                    className={`truncate text-xs font-bold leading-tight ${
                      isCurrent ? "text-amber-300" : "text-white group-hover/item:text-white"
                    }`}
                    title={song.title}
                  >
                    {song.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="truncate text-[11px] text-white/50" title={song.artist}>
                      {song.artist}
                    </p>
                    <button
                      type="button"
                      aria-label="Like"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song);
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center text-xs transition ${
                        liked ? "text-amber-400" : "text-white/30 hover:text-white"
                      }`}
                    >
                      {liked ? <IoMdHeart /> : <IoMdHeartEmpty />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MoodCard;
