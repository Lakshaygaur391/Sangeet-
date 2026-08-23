import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  IoAddCircleOutline,
  IoHeart,
  IoTimeOutline,
  IoTrashOutline,
  IoMusicalNotesOutline,
  IoAlbumsOutline,
  IoSparkles,
  IoSearchOutline,
  IoClose,
  IoCalendarOutline,
} from "react-icons/io5";
import SongRow from "../components/song/SongRow";
import ArtistCard from "../components/artist/ArtistCard";
import PlaylistCard from "../components/playlist/PlaylistCard";
import { EmptyState } from "../components/ui/StatePanels";
import { useLibrary } from "../context/LibraryContext";
import { usePlayer } from "../context/PlayerContext";
import artistService from "../services/artistService";
import { avatarFor } from "../lib/media";

const MAIN_TABS = [
  { key: "all", label: "All" },
  { key: "recent", label: "Recently Played" },
  { key: "playlists", label: "Your Playlists" },
  { key: "yearly", label: "Yearly Music" },
  { key: "songs", label: "Liked Songs" },
  { key: "artists", label: "Artists" },
  { key: "albums", label: "Albums" },
];

const Library = () => {
  const { view } = useParams();
  const {
    likedSongs,
    recentlyPlayed,
    removeFromRecentlyPlayed,
    playlists,
    yearlyPlaylists,
    clearRecentlyPlayed,
  } = useLibrary();
  const { playSong, setShuffle } = usePlayer();
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const [tab, setTab] = useState("all");
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [artistSearch, setArtistSearch] = useState("");
  const [recentSearch, setRecentSearch] = useState("");
  const [catalogArtists, setCatalogArtists] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function loadArtists() {
      const list = await artistService.getAll();
      if (!cancelled && Array.isArray(list)) {
        setCatalogArtists(list);
      }
    }
    loadArtists();
    return () => {
      cancelled = true;
    };
  }, []);

  const artistNames = useMemo(
    () => [...new Set(likedSongs.concat(recentlyPlayed).map((s) => s.artist).filter(Boolean))],
    [likedSongs, recentlyPlayed]
  );

  const displayArtistsList = useMemo(() => {
    const list =
      catalogArtists.length > 0
        ? catalogArtists
        : artistNames.map((name) => ({ name, id: name }));
    const q = artistSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => (a.name || "").toLowerCase().includes(q));
  }, [catalogArtists, artistNames, artistSearch]);

  const filteredRecentlyPlayed = useMemo(() => {
    const q = recentSearch.trim().toLowerCase();
    if (!q) return recentlyPlayed;
    return recentlyPlayed.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q) ||
        (s.language || "").toLowerCase().includes(q)
    );
  }, [recentlyPlayed, recentSearch]);

  // Filtered user playlists
  const filteredUserPlaylists = useMemo(() => {
    const q = playlistSearch.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [playlists, playlistSearch]);

  const [selectedEra, setSelectedEra] = useState("all"); // 'all' | '2020s' | '2010s' | '2000s'

  // Filtered yearly playlists
  const filteredYearlyPlaylists = useMemo(() => {
    const q = playlistSearch.trim().toLowerCase();
    if (!q) return yearlyPlaylists;
    return yearlyPlaylists.filter(
      (p) =>
        (p.name || p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [yearlyPlaylists, playlistSearch]);

  const eraFilteredYearlyPlaylists = useMemo(() => {
    let list = filteredYearlyPlaylists;
    if (selectedEra === "2020s") {
      list = list.filter((p) => {
        const y = parseInt(p.year || p.name, 10);
        return y >= 2020 && y <= 2029;
      });
    } else if (selectedEra === "2010s") {
      list = list.filter((p) => {
        const y = parseInt(p.year || p.name, 10);
        return y >= 2010 && y <= 2019;
      });
    } else if (selectedEra === "2000s") {
      list = list.filter((p) => {
        const y = parseInt(p.year || p.name, 10);
        return y >= 2000 && y <= 2009;
      });
    }
    return list;
  }, [filteredYearlyPlaylists, selectedEra]);

  // Recently updated user playlists (sorted by updatedAt or createdAt)
  const recentlyUpdatedPlaylists = useMemo(() => {
    if (!playlists || playlists.length < 2) return [];
    return [...playlists]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 4);
  }, [playlists]);

  // ── Liked Songs Dedicated View ──
  if (view === "liked") {
    return (
      <div className="space-y-6 animate-fade-in">
        <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-amber-500/20 via-amber-400/5 to-transparent p-6 shadow-xl sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,74,0.15),transparent_60%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-meta text-amber-400">Playlist</p>
              <h1 className="text-h1 mt-1 text-white">Liked Songs</h1>
              <p className="text-body mt-1.5 text-white/50">
                {likedSongs.length} {likedSongs.length === 1 ? "song" : "songs"}
              </p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/10 border border-amber-400/30 shadow-2xl">
              <IoHeart className="text-4xl text-amber-400" />
            </div>
          </div>
          {likedSongs.length > 0 && (
            <button
              type="button"
              onClick={() => playSong(likedSongs[0], likedSongs, 0)}
              className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/30 transition hover:scale-105"
            >
              Play All
            </button>
          )}
        </header>

        {likedSongs.length === 0 ? (
          <EmptyState
            icon={<IoHeart />}
            title="No liked songs yet"
            description="Tap the heart on any song to save it to your library."
            action={
              <button
                type="button"
                onClick={() => navigate("/discover")}
                className="rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg transition hover:scale-105"
              >
                Discover Music
              </button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101011]">
            <div className="divide-y divide-white/[0.03]">
              {likedSongs.map((song, i) => (
                <SongRow key={song._id || i} song={song} queue={likedSongs} index={i} showIndex />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Recently Played Dedicated View ──
  if (view === "recent") {
    return (
      <div className="space-y-6 animate-fade-in">
        <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-amber-500/15 via-[#131315] to-[#0a0a0c] p-6 shadow-2xl sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-meta font-bold uppercase tracking-widest text-amber-300">Listening History</p>
              </div>
              <h1 className="text-h1 mt-1 font-black text-white">Recently Played</h1>
              <p className="text-body mt-1 text-white/50">
                {recentlyPlayed.length} {recentlyPlayed.length === 1 ? "track recorded" : "tracks recorded in your playback history"}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {recentlyPlayed.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => playSong(recentlyPlayed[0], recentlyPlayed, 0)}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-6 py-2.5 text-sm font-black text-black shadow-lg shadow-amber-500/25 transition hover:scale-105 active:scale-95"
                  >
                    <IoPlay className="text-base translate-x-0.5" /> Play All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShuffle(true);
                      const randIdx = Math.floor(Math.random() * recentlyPlayed.length);
                      playSong(recentlyPlayed[randIdx], recentlyPlayed, randIdx);
                    }}
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/25 active:scale-95"
                  >
                    <IoShuffle className="text-base text-amber-300" /> Shuffle
                  </button>
                  <button
                    type="button"
                    onClick={clearRecentlyPlayed}
                    className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/[0.06] px-4 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15 hover:border-rose-500/35 active:scale-95"
                  >
                    <IoTrashOutline className="text-sm" /> Clear history
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Filter bar for recently played */}
        {recentlyPlayed.length > 4 && (
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141415] px-3.5 py-2 text-xs transition focus-within:border-amber-400/40">
                <IoSearchOutline className="text-sm text-white/40 shrink-0" />
                <input
                  type="text"
                  value={recentSearch}
                  onChange={(e) => setRecentSearch(e.target.value)}
                  placeholder="Filter played songs, artists..."
                  className="w-full bg-transparent text-white placeholder:text-white/35 focus:outline-none"
                />
                {recentSearch && (
                  <button type="button" onClick={() => setRecentSearch("")} className="text-white/40 hover:text-white">
                    <IoClose className="text-sm" />
                  </button>
                )}
              </div>
            </div>
            <span className="text-xs text-white/40">{filteredRecentlyPlayed.length} of {recentlyPlayed.length} tracks</span>
          </div>
        )}

        {recentlyPlayed.length === 0 ? (
          <EmptyState
            icon={<IoTimeOutline />}
            title="Nothing played yet"
            description="Songs you play across Sangeet will automatically appear here."
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
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101011]">
            <div className="divide-y divide-white/[0.03]">
              {filteredRecentlyPlayed.map((song, i) => (
                <div key={song._id || song.id || i} className="group relative flex items-center justify-between pr-2 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0 flex-1">
                    <SongRow song={song} queue={filteredRecentlyPlayed} index={i} showIndex />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove from recently played"
                    title="Remove from history"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromRecentlyPlayed(song);
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-rose-300"
                  >
                    <IoClose className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Artists View ──
  if (view === "artists") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-meta text-amber-400">Creators</p>
            <h1 className="text-h1 text-white">Artists to Explore</h1>
            <p className="text-caption text-white/50 mt-1">Discover verified artists and their complete song collections</p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141415] px-3.5 py-2 text-xs transition focus-within:border-amber-400/40">
              <IoSearchOutline className="text-sm text-white/40 shrink-0" />
              <input
                type="text"
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
                placeholder="Search artists..."
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
        </div>

        {displayArtistsList.length === 0 ? (
          <EmptyState
            title="No artists found"
            description="Try searching with a different artist name."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {displayArtistsList.map((artist) => (
              <ArtistCard key={artist.id || artist.name} artist={artist} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Albums View ──
  if (view === "albums") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-h1 text-white">Saved Albums</h1>
        <EmptyState
          icon={<IoAlbumsOutline />}
          title="No saved albums"
          description="Albums you save will appear here in your collection."
        />
      </div>
    );
  }

  // ── Default Main Library Overview ──
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & New Playlist Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-meta text-amber-400">Collection</p>
          <h1 className="text-h1 text-white">Your Library</h1>
        </div>

        <button
          type="button"
          onClick={() => outletCtx?.openCreatePlaylist?.()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-105 active:scale-95"
        >
          <IoAddCircleOutline className="text-lg" /> New Playlist
        </button>
      </div>

      {/* Tabs Filter Bar & Playlist Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {MAIN_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold tracking-wider transition-all duration-150 ${
                tab === t.key
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "bg-white/[0.05] text-white/55 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* In-library playlist search */}
        {(tab === "all" || tab === "playlists" || tab === "yearly") && (
          <div className="relative max-w-xs w-full">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141415] px-3.5 py-2 text-xs transition focus-within:border-amber-400/40 focus-within:ring-1 focus-within:ring-amber-400/20">
              <IoSearchOutline className="text-sm text-white/40 shrink-0" />
              <input
                type="text"
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
                placeholder="Search playlists..."
                className="w-full bg-transparent text-white placeholder:text-white/35 focus:outline-none"
              />
              {playlistSearch && (
                <button
                  type="button"
                  onClick={() => setPlaylistSearch("")}
                  className="text-white/40 hover:text-white"
                >
                  <IoClose />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Section: Your Playlists ── */}
      {(tab === "all" || tab === "playlists") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 text-white">Your Playlists</h2>
            <span className="text-xs font-semibold text-white/40">
              {filteredUserPlaylists.length} {filteredUserPlaylists.length === 1 ? "playlist" : "playlists"}
            </span>
          </div>

          {filteredUserPlaylists.length === 0 && !playlistSearch ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => outletCtx?.openCreatePlaylist?.()}
              onKeyDown={(e) => e.key === "Enter" && outletCtx?.openCreatePlaylist?.()}
              className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-amber-400/40 hover:bg-white/[0.04]"
            >
              <IoAddCircleOutline className="text-3xl text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-white">Create your first playlist</p>
              <p className="text-xs text-white/40 mt-1 max-w-xs">
                Organize your favourite songs into custom mixes for any mood or moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {/* Create Playlist Action Card */}
              <button
                type="button"
                onClick={() => outletCtx?.openCreatePlaylist?.()}
                className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/40 hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10 text-amber-400 mb-3 transition group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-black">
                  <IoAddCircleOutline className="text-2xl" />
                </div>
                <p className="text-sm font-bold text-white">Create Playlist</p>
                <p className="text-[11px] text-white/40 mt-1">Custom mix</p>
              </button>

              {/* User Playlists Cards */}
              {filteredUserPlaylists.map((p) => (
                <PlaylistCard key={p.id || p._id} playlist={p} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Section: Recently Played (Preview on Library Home) ── */}
      {(tab === "all" || tab === "recent") && recentlyPlayed.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-h2 text-white">Recently Played</h2>
              <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                History
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => playSong(recentlyPlayed[0], recentlyPlayed, 0)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition hover:scale-105"
              >
                <IoPlay className="text-sm" /> Play All
              </button>
              {recentlyPlayed.length > 6 && (
                <button
                  type="button"
                  onClick={() => navigate("/library/recent")}
                  className="text-xs font-semibold text-white/50 hover:text-white"
                >
                  See all ({recentlyPlayed.length})
                </button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101011]">
            <div className="divide-y divide-white/[0.03]">
              {recentlyPlayed.slice(0, tab === "recent" ? undefined : 6).map((song, i) => (
                <div
                  key={song._id || song.id || i}
                  className="group relative flex items-center justify-between pr-2 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <SongRow song={song} queue={recentlyPlayed} index={i} showIndex />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove from recently played"
                    title="Remove from history"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromRecentlyPlayed(song);
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/30 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-rose-300"
                  >
                    <IoClose className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Section: Smart Yearly Music Playlists ── */}
      {(tab === "all" || tab === "yearly") && yearlyPlaylists.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-white/[0.07] bg-[#0f0f12]/70 p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-h2 font-black text-white">Yearly Rewind</h2>
                <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  <IoSparkles className="text-[10px]" /> Smart Collections
                </span>
              </div>
              <p className="text-caption mt-1 text-white/50">
                Curated music playlists automatically organized by release year ({yearlyPlaylists.length} Years).
              </p>
            </div>

            {/* Era Filter Tabs */}
            <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
              {[
                { key: "all", label: "All Years" },
                { key: "2020s", label: "2020s" },
                { key: "2010s", label: "2010s" },
                { key: "2000s", label: "2000s" },
              ].map((era) => (
                <button
                  key={era.key}
                  type="button"
                  onClick={() => setSelectedEra(era.key)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                    selectedEra === era.key
                      ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-105"
                      : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {era.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clean Single-Row Horizontal Quick Jump Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {eraFilteredYearlyPlaylists.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/playlist/${p.id}`)}
                className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-3.5 py-1 text-xs font-bold text-amber-200/90 shadow-sm transition hover:border-amber-400/40 hover:bg-amber-400/15 hover:text-amber-100 active:scale-95"
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Playlist Cards Grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {eraFilteredYearlyPlaylists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Section: Recently Updated (if > 1 user playlist) ── */}
      {tab === "all" && recentlyUpdatedPlaylists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 text-white">Recently Updated</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {recentlyUpdatedPlaylists.map((p) => (
              <PlaylistCard key={`rec-${p.id || p._id}`} playlist={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Section: Liked Songs Preview ── */}
      {(tab === "all" || tab === "songs") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 text-white">Liked Songs</h2>
            {likedSongs.length > 5 && (
              <button
                type="button"
                onClick={() => navigate("/library/liked")}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                See all ({likedSongs.length})
              </button>
            )}
          </div>

          {likedSongs.length === 0 ? (
            <EmptyState
              icon={<IoHeart />}
              title="No liked songs"
              description="Heart songs anywhere in Sangeet to save them here."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101011]">
              <div className="divide-y divide-white/[0.03]">
                {likedSongs.slice(0, tab === "songs" ? undefined : 6).map((song, i) => (
                  <SongRow key={song._id || i} song={song} queue={likedSongs} index={i} showIndex />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Section: Artists ── */}
      {tab === "artists" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2 text-white">Artists to Explore</h2>
            <span className="text-xs text-white/40">{displayArtistsList.length} artists</span>
          </div>
          {displayArtistsList.length === 0 ? (
            <EmptyState
              title="No artists yet"
              description="Artists will appear here as music is added to Sangeet."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {displayArtistsList.map((artist) => (
                <ArtistCard key={artist.id || artist.name} artist={artist} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Section: Albums ── */}
      {tab === "albums" && (
        <EmptyState
          icon={<IoAlbumsOutline />}
          title="No saved albums"
          description="Albums you save will appear in this section."
        />
      )}
    </div>
  );
};

export default Library;
