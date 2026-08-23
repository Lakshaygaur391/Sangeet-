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
    return () => { cancelled = true; };
  }, [id]);

  if (album === undefined) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-64 w-full rounded-3xl" />
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
    <div className="space-y-6">
      {/* Hero header with blurred cover background */}
      <header className="relative overflow-hidden rounded-3xl border border-white/[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: album.coverImage ? `url(${album.coverImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(60px) brightness(0.28) saturate(120%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-end md:p-8" style={{ minHeight: "14rem" }}>
          <img
            src={album.coverImage}
            alt=""
            className="h-36 w-36 shrink-0 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 sm:h-44 sm:w-44"
          />
          <div className="min-w-0">
            <p className="text-meta text-amber-400">Album</p>
            <h1 className="text-h1 mt-1 truncate text-white">{album.name}</h1>
            <p className="text-body mt-2 text-white/55">
              {album.artist}
              {album.releaseYear ? ` · ${album.releaseYear}` : ""}
              {` · ${songs.length} ${songs.length === 1 ? "track" : "tracks"}`}
            </p>
          </div>
        </div>
      </header>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={songs.length === 0}
          onClick={() => {
            if (!isAuthenticated) { openAuthPrompt("default"); return; }
            playSong(songs[0], songs, 0);
          }}
          className="flex items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
          style={{ width: "3.25rem", height: "3.25rem" }}
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
          className="flex items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/25 hover:bg-white/5 hover:text-white disabled:opacity-30"
          style={{ width: "2.9rem", height: "2.9rem" }}
          aria-label="Shuffle album"
        >
          <IoShuffle className="text-lg" />
        </button>
      </div>

      {/* Tracklist */}
      {songs.length === 0 ? (
        <EmptyState title="No tracks in this album" />
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#111112] p-2">
          {songs.map((song, i) => (
            <SongRow key={song._id || i} song={song} queue={songs} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Album;
