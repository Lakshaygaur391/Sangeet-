import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoPlay, IoCheckmarkCircle } from "react-icons/io5";
import { getArtistImage, avatarFor } from "../../lib/media";

const ArtistCard = ({ artist, onPlay }) => {
  const navigate = useNavigate();
  const rawName = (artist?.name || "").trim();
  const initialImage =
    artist?.image ||
    (artist?.songs?.[0]?.thumbnail_url) ||
    getArtistImage(rawName);

  const [imgSrc, setImgSrc] = useState(initialImage);
  const [imgFailed, setImgFailed] = useState(false);

  const songCount = (artist?.songs || []).length;

  const handleImageError = () => {
    if (!imgFailed) {
      setImgFailed(true);
      setImgSrc(avatarFor(rawName, "1c1c1e&color=eab34a"));
    }
  };

  return (
    <button
      type="button"
      onClick={() => navigate(`/artist/${encodeURIComponent(rawName)}`)}
      className="group relative flex w-36 shrink-0 flex-col items-center rounded-2xl border border-white/5 bg-[#141416] p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:bg-[#1a1a1e] hover:shadow-xl hover:shadow-amber-500/10 sm:w-40 md:w-44"
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-full border-2 border-white/10 shadow-md transition-all duration-300 group-hover:border-amber-400 group-hover:shadow-[0_0_20px_rgba(234,179,74,0.25)]">
        <img
          src={imgSrc}
          alt={rawName}
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {onPlay && (
          <span
            role="button"
            aria-label={`Play ${rawName}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(artist);
            }}
            className="absolute bottom-1 right-1 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-amber-400 text-black opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
          >
            <IoPlay className="translate-x-0.5 text-lg" />
          </span>
        )}
      </div>

      <div className="w-full px-1">
        <p className="flex items-center justify-center gap-1 truncate text-sm font-semibold text-white transition group-hover:text-amber-400 sm:text-base">
          {rawName}
          {(artist?.verified ?? true) && (
            <IoCheckmarkCircle className="shrink-0 text-amber-400 text-sm" title="Verified artist" />
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/50">
          {songCount > 0 ? `${songCount} songs` : "Artist"}
        </p>
      </div>
    </button>
  );
};

export default ArtistCard;
