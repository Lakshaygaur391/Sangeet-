import { useNavigate } from "react-router-dom";
import { IoPlay, IoCheckmarkCircle } from "react-icons/io5";
import { avatarFor } from "../../lib/media";

const ArtistCard = ({ artist, onPlay }) => {
  const navigate = useNavigate();
  const image = artist.image || avatarFor(artist.name);
  const songCount = (artist.songs || []).length;

  return (
    <button
      type="button"
      onClick={() => navigate(`/artist/${encodeURIComponent((artist.name || "").trim())}`)}
      className="group w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#161616] text-left text-white shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 sm:w-36 md:w-40"
    >
      <div className="relative">
        <img src={image} alt={artist.name} className="aspect-square w-full rounded-t-2xl object-cover" />
        {onPlay && (
          <span
            role="button"
            aria-label={`Play ${artist.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(artist);
            }}
            className="absolute bottom-2 right-2 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-amber-400 text-black opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100"
          >
            <IoPlay className="translate-x-0.5" />
          </span>
        )}
      </div>
      <div className="px-3 py-2 text-center">
        <p className="flex items-center justify-center gap-1 truncate text-sm font-semibold sm:text-base">
          {artist.name}
          {artist.verified && <IoCheckmarkCircle className="shrink-0 text-amber-400" title="Verified artist" />}
        </p>
        {songCount > 0 && <p className="text-meta mt-0.5">{songCount} songs</p>}
      </div>
    </button>
  );
};

export default ArtistCard;
