import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  IoPlay,
  IoPause,
  IoShuffle,
  IoCheckmarkCircle,
  IoPersonAddOutline,
  IoPersonRemoveOutline,
  IoSearchOutline,
  IoClose,
  IoTimeOutline,
} from "react-icons/io5";
import SongRow from "../components/song/SongRow";
import ArtistCard from "../components/artist/ArtistCard";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { SkeletonList } from "../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../components/ui/StatePanels";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService, { getCachedCatalogSync } from "../services/songService";
import { normalizeSong, getArtistImage, isArtistMatch, avatarFor } from "../lib/media";

const PAGE_SIZE = 30;

const Artist = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const cached = getCachedCatalogSync();
  const [allSongs, setAllSongs] = useState(cached || []);
  const [status, setStatus] = useState(cached && cached.length > 0 ? "ready" : "loading");
  const [following, setFollowing] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [artistSearch, setArtistSearch] = useState("");
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
    setArtistSearch("");
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
      if (ya > 0 && yb > 0) return yb - ya;
      if (ya > 0) return -1;
      if (yb > 0) return 1;
      return 0;
    });
  }, [songs, decodedName]);

  const displayArtistSongs = useMemo(() => {
    const q = artistSearch.trim().toLowerCase();
    if (!q) return artistSongs;
    return artistSongs.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.album || "").toLowerCase().includes(q)
    );
  }, [artistSongs, artistSearch]);

  const totalDuration = useMemo(() => {
    return artistSongs.reduce((acc, s) => acc + (s.duration || 210), 0);
  }, [artistSongs]);

  const artistCover = useMemo(() => {
    const songWithThumb = artistSongs.find(
      (s) => s.thumbnail_url && !s.thumbnail_url.includes("ui-avatars.com")
    );
    return getArtistImage(decodedName, songWithThumb?.thumbnail_url) || avatarFor(decodedName, "18181b&color=eab34a");
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
          id: art,
          name: art,
          image: getArtistImage(art, s.thumbnail_url),
          songs: [s],
        });
      }
    });
    return list.slice(0, 10);
  }, [songs, artistSongs, decodedName]);

  const isArtistActive = useMemo(() => {
    if (!currentSong || artistSongs.length === 0) return false;
    return artistSongs.some((s) => (s._id || s.id) === (currentSong._id || currentSong.id));
  }, [currentSong, artistSongs]);

  const handlePlayAll = () => {
    if (artistSongs.length === 0) return;
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    if (isArtistActive) {
      setIsPlaying(!isPlaying);
    } else {
      const targetQueue = displayArtistSongs.length > 0 ? displayArtistSongs : artistSongs;
      playSong(targetQueue[0], targetQueue, 0);
    }
  };

  const handleShuffle = () => {
    if (artistSongs.length === 0) return;
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    const shuffled = [...artistSongs].sort(() => 0.5 - Math.random());
    playSong(shuffled[0], shuffled, 0);
  };

  if (status === "loading") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-64 w-full rounded-3xl" />
        <SkeletonList count={6} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        message="Couldn't load this artist right now."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (artistSongs.length === 0) {
    return (
      <EmptyState
        title="Artist not found"
        description={`No songs found for "${decodedName}". Try searching for another artist or check spelling.`}
        action={
          <button
            type="button"
            onClick={() => navigate("/discover")}
            className="rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg transition hover:scale-105"
          >
            Explore Music
          </button>
        }
      />
    );
  }

  const paginatedSongs = artistSearch ? displayArtistSongs : displayArtistSongs.slice(0, visibleCount);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ── Hero Header ── */}
      <header
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#1c1c1f]/95 via-[#121214] to-[#0c0c0d] p-6 shadow-2xl sm:p-8 md:p-10"
        style={{ minHeight: "18rem" }}
      >
        {/* Full-bleed blurred ambient background */}
        <div
          className="absolute inset-0 -z-10 opacity-30 blur-3xl scale-125 pointer-events-none"
          style={{
            backgroundImage: `url(${artistCover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0c0c0d] via-[#0c0c0d]/60 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-6 md:gap-8">
          <div className="relative aspect-square w-32 sm:w-40 md:w-48 shrink-0 overflow-hidden rounded-full border-4 border-white/10 shadow-2xl bg-[#18181b] ring-2 ring-amber-400/40">
            <img
              src={artistCover}
              alt={decodedName}
              onError={() => setHeroImgError(true)}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-meta flex items-center gap-1.5 text-amber-400 font-bold tracking-wider">
              <IoCheckmarkCircle className="text-base" /> Verified Artist
            </p>
            <h1
              className="text-display mt-2 text-white truncate drop-shadow-md text-3xl sm:text-4xl md:text-5xl font-extrabold"
              title={decodedName}
            >
              {decodedName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/50 sm:text-sm">
              <span className="font-semibold text-white/90">
                {artistSongs.length} {artistSongs.length === 1 ? "song" : "songs"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <IoTimeOutline className="text-sm text-white/40" />
                {Math.floor(totalDuration / 60)} mins
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Action Transport Bar ── */}
      <div className="flex items-center gap-3">
        {/* Play Button */}
        <button
          type="button"
          onClick={handlePlayAll}
          className="flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label={`Play all songs by ${decodedName}`}
        >
          {isArtistActive && isPlaying ? (
            <>
              <IoPause className="text-lg" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <IoPlay className="translate-x-0.5 text-lg" />
              <span>Play All</span>
            </>
          )}
        </button>

        {/* Shuffle Button */}
        <button
          type="button"
          onClick={handleShuffle}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/75 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white active:scale-95"
          aria-label="Shuffle play"
        >
          <IoShuffle className="text-xl" />
        </button>

        {/* Follow Button */}
        <button
          type="button"
          onClick={handleFollowToggle}
          aria-pressed={following}
          className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
            following
              ? "border-amber-400/40 bg-amber-400/[0.1] text-amber-200"
              : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          {following ? <IoPersonRemoveOutline /> : <IoPersonAddOutline />}
          {following ? "Following" : "Follow"}
        </button>
      </div>

      {/* ── Discography / All Songs ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-h2 text-white">All Songs</h2>
            <p className="text-caption text-white/45">
              Complete catalog by {decodedName} ({artistSongs.length} tracks sorted by release year)
            </p>
          </div>

          {/* Search within artist songs if > 6 songs */}
          {artistSongs.length > 6 && (
            <div className="relative max-w-xs w-full">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141415] px-3.5 py-2 text-xs transition focus-within:border-amber-400/40">
                <IoSearchOutline className="text-sm text-white/40 shrink-0" />
                <input
                  type="text"
                  value={artistSearch}
                  onChange={(e) => setArtistSearch(e.target.value)}
                  placeholder={`Search ${decodedName}'s tracks...`}
                  className="w-full bg-transparent text-white placeholder:text-white/35 focus:outline-none"
                />
                {artistSearch && (
                  <button
                    type="button"
                    onClick={() => setArtistSearch("")}
                    className="text-white/40 hover:text-white"
                  >
                    <IoClose />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {displayArtistSongs.length === 0 ? (
          <EmptyState
            title="No songs found"
            description={`No tracks matching "${artistSearch}".`}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101011] shadow-xl">
            <div className="divide-y divide-white/[0.03]">
              {paginatedSongs.map((song, i) => (
                <SongRow
                  key={song._id || song.id || `${song.audio_url}-${i}`}
                  song={song}
                  queue={displayArtistSongs}
                  index={i}
                  showIndex
                />
              ))}
            </div>
          </div>
        )}

        {!artistSearch && visibleCount < artistSongs.length && (
          <div className="mt-4">
            <LoadMoreButton
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              label="Load More Songs"
            />
          </div>
        )}
      </div>

      {/* ── Related Artists ── */}
      {relatedArtists.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-h2 text-white">Related Artists</h2>
            <p className="text-caption text-white/45">Listeners also love</p>
          </div>
          <div className="scrollbar-none flex gap-4 overflow-x-auto py-2 md:gap-6">
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
