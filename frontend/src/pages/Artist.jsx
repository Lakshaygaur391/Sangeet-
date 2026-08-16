import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IoPlay, IoCheckmarkCircle, IoPersonAddOutline, IoPersonRemoveOutline, IoShuffle } from "react-icons/io5";
import SongRow from "../components/song/SongRow";
import ArtistCard from "../components/artist/ArtistCard";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { SkeletonList } from "../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../components/ui/StatePanels";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService, { getCachedCatalogSync } from "../services/songService";
import { normalizeSong, getArtistImage, isArtistMatch } from "../lib/media";

const PAGE_SIZE = 25;

const Artist = () => {
  const { name } = useParams();
  const { playSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const cached = getCachedCatalogSync();
  const [allSongs, setAllSongs] = useState(cached || []);
  const [status, setStatus] = useState(cached && cached.length > 0 ? "ready" : "loading");
  const [following, setFollowing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const decodedName = decodeURIComponent(name || "").trim();

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      openAuthPrompt("follow");
      return;
    }
    setFollowing((v) => !v);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getCachedCatalogSync()) {
        setStatus("loading");
      }
      const fetched = await songService.getAll();
      if (cancelled) return;
      if (fetched === null && !getCachedCatalogSync()) {
        setStatus("error");
        return;
      }
      if (fetched) {
        setAllSongs(fetched);
      }
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset pagination on artist change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [decodedName]);

  const songs = useMemo(() => allSongs.map(normalizeSong), [allSongs]);

  // Robust artist matching for single, collaborative, and feat. tracks
  const artistSongs = useMemo(() => {
    if (!decodedName) return [];
    const matched = songs.filter((s) => isArtistMatch(s.artist, decodedName, s.title));

    // Sort newest releases first (latest year → oldest). Songs with no year go to the end.
    return matched.sort((a, b) => {
      const ya = parseInt(a.year || "0", 10);
      const yb = parseInt(b.year || "0", 10);
      // Both have a year → compare descending
      if (ya > 0 && yb > 0) return yb - ya;
      // Only a has a year → a goes first
      if (ya > 0) return -1;
      // Only b has a year → b goes first
      if (yb > 0) return 1;
      // Neither has a year → stable order
      return 0;
    });
  }, [songs, decodedName]);

  const artistCover = useMemo(() => {
    const songWithThumb = artistSongs.find((s) => s.thumbnail_url && !s.thumbnail_url.includes("ui-avatars.com"));
    return getArtistImage(decodedName, songWithThumb?.thumbnail_url);
  }, [artistSongs, decodedName]);

  const relatedArtists = useMemo(() => {
    const languages = new Set(artistSongs.map((s) => s.language).filter(Boolean));
    const seenNames = new Set([decodedName.toLowerCase()]);
    const list = [];

    songs.forEach((s) => {
      const art = (s.artist || "").trim();
      if (!art) return;
      const artLower = art.toLowerCase();

      if (!seenNames.has(artLower) && (languages.size === 0 || languages.has(s.language))) {
        seenNames.add(artLower);
        list.push({
          name: art,
          image: getArtistImage(art, s.thumbnail_url),
          songs: [s],
        });
      }
    });
    return list.slice(0, 10);
  }, [songs, artistSongs, decodedName]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="skeleton h-56 w-full rounded-3xl" />
        <SkeletonList count={6} />
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState message="Couldn't load this artist right now." onRetry={() => window.location.reload()} />;
  }

  if (artistSongs.length === 0) {
    return (
      <EmptyState
        title="Artist not found"
        description={`No songs found for "${decodedName}". Try searching for another artist or check spelling.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Artist Hero Header */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121214] shadow-2xl">
        <img
          src={artistCover}
          alt=""
          className="h-60 w-full object-cover scale-105 blur-md brightness-[0.35] transition-all duration-700 md:h-80"
        />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/60 to-transparent p-5 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="relative shrink-0">
              <img
                src={artistCover}
                alt={decodedName}
                className="h-28 w-28 rounded-full border-4 border-[#0f0f11] object-cover shadow-2xl md:h-36 md:w-36 ring-2 ring-amber-400/40"
              />
            </div>
            <div>
              <p className="text-meta flex items-center gap-1.5 text-amber-300 font-medium">
                <IoCheckmarkCircle className="text-base" /> Verified Artist
              </p>
              <h1 className="text-display mt-1 text-white font-bold tracking-tight text-3xl md:text-5xl">{decodedName}</h1>
              <p className="text-body mt-2 text-white/70 font-medium">
                {artistSongs.length} {artistSongs.length === 1 ? "track" : "tracks"} available
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              openAuthPrompt("default");
              return;
            }
            playSong(artistSongs[0], artistSongs, 0);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-black transition hover:bg-amber-300 shadow-lg shadow-amber-400/20"
          aria-label={`Play all songs by ${decodedName}`}
        >
          <IoPlay className="translate-x-0.5 text-xl" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              openAuthPrompt("default");
              return;
            }
            const shuffled = [...artistSongs].sort(() => 0.5 - Math.random());
            playSong(shuffled[0], shuffled, 0);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition"
          aria-label="Shuffle"
        >
          <IoShuffle className="text-lg" />
        </button>

        <button
          type="button"
          onClick={handleFollowToggle}
          aria-pressed={following}
          className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
            following ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/15 text-white/70 hover:bg-white/5"
          }`}
        >
          {following ? <IoPersonRemoveOutline /> : <IoPersonAddOutline />}
          {following ? "Following" : "Follow"}
        </button>
      </div>

      {/* Popular Tracks List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h2 text-white">Songs &amp; Discography</h2>
          <span className="text-xs text-white/40">Showing {Math.min(visibleCount, artistSongs.length)} of {artistSongs.length}</span>
        </div>
        <div className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-[#121214]/60 p-2">
          {artistSongs.slice(0, visibleCount).map((song, i) => (
            <SongRow key={song._id || `${song.audio_url}-${i}`} song={song} queue={artistSongs} index={i} showIndex />
          ))}
        </div>
        {visibleCount < artistSongs.length && (
          <div className="mt-4">
            <LoadMoreButton
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              label="Load More Songs"
            />
          </div>
        )}
      </div>

      {/* Related Artists */}
      {relatedArtists.length > 0 && (
        <div>
          <h2 className="text-h2 mb-3 text-white">Fans Also Like</h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2 md:gap-4">
            {relatedArtists.map((a) => (
              <ArtistCard key={a.name} artist={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Artist;
