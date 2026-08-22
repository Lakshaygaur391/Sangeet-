import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoPlay, IoCheckmarkCircle } from "react-icons/io5";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import songService from "../../services/songService";
import { normalizeSong } from "../../lib/media";

// Get initials from artist name (e.g. "Arijit Singh" -> "AS")
function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "♪";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic gradient generator for artist fallbacks
function getArtistGradient(name = "") {
  const hash = Array.from(String(name)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    "from-amber-600/40 via-amber-900/30 to-[#121214]",
    "from-amber-500/35 via-zinc-800 to-[#121214]",
    "from-orange-600/30 via-zinc-900 to-[#121214]",
    "from-yellow-600/30 via-stone-900 to-[#121214]",
    "from-amber-700/35 via-neutral-900 to-[#121214]",
  ];
  return gradients[hash % gradients.length];
}

const ArtistCard = ({ artist, onPlay }) => {
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [imgError, setImgError] = useState(false);
  const [isPlayingLoading, setIsPlayingLoading] = useState(false);

  if (!artist || !artist.name) return null;

  const rawImage =
    artist.image ||
    artist.thumbnail_url ||
    artist.thumbnail ||
    artist.avatar ||
    artist.songs?.[0]?.thumbnail_url ||
    "";

  // Filter out known broken/restricted domains if needed
  const isValidSrc = rawImage && !imgError;
  const songCount = artist.songCount ?? (artist.songs || []).length;
  const artistName = String(artist.name).trim();
  const initials = getInitials(artistName);
  const gradientClass = getArtistGradient(artistName);

  const handlePlayArtist = async (e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }

    if (onPlay) {
      onPlay(artist);
      return;
    }

    // If artist already has songs array, play immediately
    if (Array.isArray(artist.songs) && artist.songs.length > 0) {
      playSong(artist.songs[0], artist.songs, 0);
      return;
    }

    // Otherwise fetch songs by artist dynamically
    try {
      setIsPlayingLoading(true);
      const allSongs = await songService.getAll();
      const artistSongs = (allSongs || [])
        .map(normalizeSong)
        .filter((s) => s.artist.toLowerCase().includes(artistName.toLowerCase()));

      if (artistSongs.length > 0) {
        playSong(artistSongs[0], artistSongs, 0);
      } else {
        navigate(`/artist/${encodeURIComponent(artistName)}`);
      }
    } catch {
      navigate(`/artist/${encodeURIComponent(artistName)}`);
    } finally {
      setIsPlayingLoading(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${artistName}'s profile`}
      onClick={() => navigate(`/artist/${encodeURIComponent(artistName)}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/artist/${encodeURIComponent(artistName)}`)}
      className="group relative flex flex-col items-center w-32 shrink-0 cursor-pointer text-center text-white transition-all duration-200 hover:-translate-y-1 sm:w-36 md:w-40 select-none"
    >
      {/* Circular artwork container */}
      <div className="relative mx-auto mb-2.5 aspect-square w-full max-w-[130px] sm:max-w-[145px] md:max-w-[160px]">
        <div className="relative h-full w-full overflow-hidden rounded-full border border-white/10 bg-[#171718] shadow-lg shadow-black/40 transition-all duration-300 group-hover:border-amber-400/40 group-hover:shadow-2xl group-hover:shadow-amber-500/15">
          {isValidSrc ? (
            <img
              src={rawImage}
              alt={artistName}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            /* Premium Sangeet Avatar Fallback */
            <div
              className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-b ${gradientClass} transition-transform duration-300 group-hover:scale-105`}
            >
              <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-amber-300 drop-shadow-md">
                {initials}
              </span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/60">
                Sangeet
              </span>
            </div>
          )}

          {/* Hover Dark Vignette */}
          <div className="pointer-events-none absolute inset-0 bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>

        {/* Floating Play Button on Hover */}
        <button
          type="button"
          aria-label={`Play ${artistName}`}
          onClick={handlePlayArtist}
          disabled={isPlayingLoading}
          className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black opacity-0 shadow-xl shadow-black/70 transition-all duration-200 hover:scale-110 group-hover:opacity-100 translate-y-1.5 group-hover:translate-y-0 disabled:cursor-wait"
        >
          <IoPlay className="translate-x-0.5 text-base" />
        </button>
      </div>

      {/* Artist Name + Verified Badge */}
      <div className="w-full px-1">
        <p
          className="flex items-center justify-center gap-1 truncate text-xs font-bold text-white transition-colors duration-150 group-hover:text-amber-200 sm:text-sm leading-snug"
          title={artistName}
        >
          <span className="truncate">{artistName}</span>
          {artist.verified && (
            <IoCheckmarkCircle
              className="shrink-0 text-amber-400 text-xs sm:text-sm"
              title="Verified Artist"
            />
          )}
        </p>

        {/* Subtitle / Metadata */}
        <p className="mt-0.5 text-[11px] font-medium text-white/40">
          {songCount > 0 ? `${songCount} songs` : "Artist"}
        </p>
      </div>
    </div>
  );
};

export default ArtistCard;
