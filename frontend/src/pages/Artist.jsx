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
import { SkeletonList } from "../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../components/ui/StatePanels";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService from "../services/songService";
import { normalizeSong, avatarFor, formatTime } from "../lib/media";

const Artist = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const { songList, setSongList, currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [status, setStatus] = useState("loading");
  const [following, setFollowing] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [artistSearch, setArtistSearch] = useState("");

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
      if (songList.length > 0) {
        setStatus("ready");
        return;
      }
      setStatus("loading");
      const songs = await songService.getAll();
      if (cancelled) return;
      if (songs === null) {
        setStatus("error");
        return;
      }
      setSongList(songs);
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [songList.length, setSongList]);

  const songs = useMemo(() => songList.map(normalizeSong), [songList]);

  // Robust artist matching (exact or substring matching)
  const artistSongs = useMemo(() => {
    const target = decodedName.toLowerCase();
    return songs.filter((s) => {
      const art = (s.artist || "").toLowerCase();
      return art === target || art.includes(target) || target.includes(art);
    });
  }, [songs, decodedName]);

  const displayArtistSongs = useMemo(() => {
    const q = artistSearch.trim().toLowerCase();
    if (!q) return artistSongs;
    return artistSongs.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [artistSongs, artistSearch]);

  const totalDuration = useMemo(() => {
    return artistSongs.reduce((acc, s) => acc + (s.duration || 210), 0);
  }, [artistSongs]);

  const relatedArtists = useMemo(() => {
    const languages = new Set(artistSongs.map((s) => s.language).filter(Boolean));
    const names = new Set();
    songs.forEach((s) => {
      if (
        s.artist &&
        s.artist.toLowerCase() !== decodedName.toLowerCase() &&
        languages.has(s.language)
      ) {
        names.add(s.artist);
      }
    });
    return [...names].slice(0, 10).map((n) => ({ name: n }));
  }, [songs, artistSongs, decodedName]);

  const isArtistActive = useMemo(() => {
    if (!currentSong || artistSongs.length === 0) return false;
    return artistSongs.some((s) => (s._id || s.id) === (currentSong._id || currentSong.id));
  }, [currentSong, artistSongs]);

  const avatarUrl =
    (!heroImgError && artistSongs[0]?.thumbnail_url) ||
    avatarFor(decodedName, "18181b&color=eab34a");

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
        description={`No songs found for "${decodedName}".`}
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

  const handlePlayAll = () => {
    if (artistSongs.length === 0) return;
    if (isArtistActive) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(displayArtistSongs[0] || artistSongs[0], displayArtistSongs.length > 0 ? displayArtistSongs : artistSongs, 0);
    }
  };

  const handleShuffle = () => {
    if (artistSongs.length === 0) return;
    const shuffled = [...artistSongs].sort(() => 0.5 - Math.random());
    playSong(shuffled[0], shuffled, 0);
  };

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
            backgroundImage: `url(${avatarUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0c0c0d] via-[#0c0c0d]/60 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-6 md:gap-8">
          <div className="relative aspect-square w-32 sm:w-40 md:w-48 shrink-0 overflow-hidden rounded-full border-4 border-white/10 shadow-2xl bg-[#18181b]">
            <img
              src={avatarUrl}
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
              className="text-display mt-2 text-white truncate drop-shadow-md"
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
              Complete catalog by {decodedName} ({artistSongs.length} tracks)
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
              {displayArtistSongs.map((song, i) => (
                <SongRow
                  key={song._id || song.id || i}
                  song={song}
                  queue={displayArtistSongs}
                  index={i}
                  showIndex
                />
              ))}
            </div>
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
