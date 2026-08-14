import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IoPlay, IoShuffle } from "react-icons/io5";
import SongRow from "../components/song/SongRow";
import { EmptyState } from "../components/ui/StatePanels";
import { SkeletonList } from "../components/ui/Skeleton";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import albumService from "../services/albumService";
import { normalizeSong } from "../lib/media";

const Album = () => {
  const { id } = useParams();
  const { playSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [album, setAlbum] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let cancelled = false;
    albumService.getById(id).then((data) => {
      if (!cancelled) setAlbum(data);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (album === undefined) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-56 w-full rounded-3xl" />
        <SkeletonList count={5} />
      </div>
    );
  }

  if (!album) {
    return (
      <EmptyState
        title="Albums aren't available yet"
        description="This backend doesn't expose album data yet — once /api/albums is live, this page will show artwork, tracklist, and release info automatically."
      />
    );
  }

  const songs = (album.songs || []).map(normalizeSong);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#141414] p-5 sm:flex-row sm:items-end">
        <img src={album.coverImage} alt="" className="h-32 w-32 shrink-0 rounded-2xl object-cover shadow-xl sm:h-40 sm:w-40" />
        <div className="min-w-0">
          <p className="text-meta">Album</p>
          <h1 className="text-h1 mt-1 truncate text-white">{album.name}</h1>
          <p className="text-body mt-1 text-white/50">
            {album.artist} · {album.releaseYear} · {songs.length} tracks
          </p>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={songs.length === 0}
          onClick={() => {
            if (!isAuthenticated) { openAuthPrompt("default"); return; }
            playSong(songs[0], songs, 0);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-30"
          aria-label="Play album"
        >
          <IoPlay className="translate-x-0.5 text-xl" />
        </button>
        <button
          type="button"
          disabled={songs.length === 0}
          onClick={() => {
            if (!isAuthenticated) { openAuthPrompt("default"); return; }
            const shuffled = [...songs].sort(() => 0.5 - Math.random());
            playSong(shuffled[0], shuffled, 0);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/5 disabled:opacity-30"
          aria-label="Shuffle album"
        >
          <IoShuffle className="text-lg" />
        </button>
      </div>

      {songs.length === 0 ? (
        <EmptyState title="No tracks in this album" />
      ) : (
        <div>
          {songs.map((song, i) => (
            <SongRow key={song._id || i} song={song} queue={songs} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Album;
