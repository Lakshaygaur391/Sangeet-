import { useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { IoAddCircleOutline, IoHeart, IoTimeOutline, IoTrashOutline } from "react-icons/io5";
import SongRow from "../components/song/SongRow";
import ArtistCard from "../components/artist/ArtistCard";
import { EmptyState } from "../components/ui/StatePanels";
import { useLibrary } from "../context/LibraryContext";
import { avatarFor } from "../lib/media";

const TABS = [
  { key: "all", label: "All" },
  { key: "playlists", label: "Playlists" },
  { key: "songs", label: "Songs" },
  { key: "albums", label: "Albums" },
  { key: "artists", label: "Artists" },
];

// Handles /library, /library/liked, /library/recent, /library/albums, /library/artists
const Library = () => {
  const { view } = useParams(); // "liked" | "recent" | "albums" | "artists" | undefined
  const { likedSongs, recentlyPlayed, playlists, clearRecentlyPlayed } = useLibrary();
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const [tab, setTab] = useState("all");

  const artistNames = useMemo(
    () => [...new Set(likedSongs.concat(recentlyPlayed).map((s) => s.artist).filter(Boolean))],
    [likedSongs, recentlyPlayed]
  );

  if (view === "liked") {
    return (
      <div className="space-y-4">
        <header className="flex items-end justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
          <div>
            <p className="text-meta text-amber-300">Playlist</p>
            <h1 className="text-h1 mt-1 text-white">Liked Songs</h1>
            <p className="text-body mt-1 text-white/45">{likedSongs.length} songs</p>
          </div>
          <IoHeart className="text-4xl text-amber-400" />
        </header>
        {likedSongs.length === 0 ? (
          <EmptyState icon={<IoHeart />} title="No liked songs yet" description="Tap the heart on any song to save it here." />
        ) : (
          <div>
            {likedSongs.map((song, i) => (
              <SongRow key={song._id || i} song={song} queue={likedSongs} index={i} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "recent") {
    return (
      <div className="space-y-4">
        <header className="flex items-end justify-between rounded-2xl border border-white/10 bg-[#141414] p-5">
          <div>
            <p className="text-meta">Your Library</p>
            <h1 className="text-h1 mt-1 text-white">Recently Played</h1>
          </div>
          {recentlyPlayed.length > 0 && (
            <button type="button" onClick={clearRecentlyPlayed} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-rose-300">
              <IoTrashOutline /> Clear history
            </button>
          )}
        </header>
        {recentlyPlayed.length === 0 ? (
          <EmptyState icon={<IoTimeOutline />} title="Nothing played yet" description="Songs you play will show up here." />
        ) : (
          <div>
            {recentlyPlayed.map((song, i) => (
              <SongRow key={song._id || i} song={song} queue={recentlyPlayed} index={i} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "artists") {
    return (
      <div className="space-y-4">
        <h1 className="text-h1 text-white">Your Artists</h1>
        {artistNames.length === 0 ? (
          <EmptyState title="No artists yet" description="Like or play a few songs and their artists will show up here." />
        ) : (
          <div className="flex flex-wrap gap-3">
            {artistNames.map((name) => (
              <ArtistCard key={name} artist={{ name, image: avatarFor(name) }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === "albums") {
    return (
      <div className="space-y-4">
        <h1 className="text-h1 text-white">Saved Albums</h1>
        <EmptyState title="No saved albums" description="Albums you save will appear here once album support is enabled on the backend." />
      </div>
    );
  }

  // Default combined library view with tabs
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-white">Your Library</h1>
        <button
          type="button"
          onClick={() => outletCtx?.openCreatePlaylist?.()}
          className="flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-2 text-xs font-semibold text-black hover:bg-amber-300"
        >
          <IoAddCircleOutline /> New Playlist
        </button>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "all" || tab === "playlists") && (
        <div>
          <h2 className="text-h2 mb-3 text-white">Your Playlists</h2>
          {playlists.length === 0 ? (
            <EmptyState title="No playlists yet" description="Create your first playlist to start organizing your favourite tracks." action={
              <button type="button" onClick={() => outletCtx?.openCreatePlaylist?.()} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300">
                Create Playlist
              </button>
            } />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {playlists.map((p) => (
                <button
                  key={p.id || p._id}
                  type="button"
                  onClick={() => navigate(`/playlist/${p.id || p._id}`)}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-[#161616] text-left transition hover:-translate-y-1"
                >
                  <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-amber-500/20 to-[#1a1a1a] text-4xl">
                    🎵
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-caption mt-0.5">{(p.songs || []).length} songs</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(tab === "all" || tab === "songs") && (
        <div>
          <h2 className="text-h2 mb-3 text-white">Liked Songs</h2>
          {likedSongs.length === 0 ? (
            <EmptyState title="No liked songs" description="Songs you like will show up here." />
          ) : (
            <div>{likedSongs.slice(0, tab === "songs" ? undefined : 5).map((song, i) => <SongRow key={song._id || i} song={song} queue={likedSongs} index={i} />)}</div>
          )}
        </div>
      )}

      {tab === "artists" && (
        <div>
          <h2 className="text-h2 mb-3 text-white">Followed Artists</h2>
          {artistNames.length === 0 ? (
            <EmptyState title="No artists yet" description="Artists you interact with will show up here." />
          ) : (
            <div className="flex flex-wrap gap-3">
              {artistNames.map((name) => <ArtistCard key={name} artist={{ name, image: avatarFor(name) }} />)}
            </div>
          )}
        </div>
      )}

      {tab === "albums" && <EmptyState title="No saved albums" description="Album support is coming once the backend exposes album data." />}
    </div>
  );
};

export default Library;
