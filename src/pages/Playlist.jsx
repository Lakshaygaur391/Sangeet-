import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  IoPlay,
  IoPause,
  IoShuffle,
  IoEllipsisHorizontal,
  IoTrashOutline,
  IoPencilOutline,
  IoShareSocialOutline,
  IoSparkles,
  IoTimeOutline,
  IoArrowUp,
  IoArrowDown,
  IoRemoveCircleOutline,
  IoInformationCircleOutline,
  IoMusicalNotes,
  IoRefreshOutline,
} from "react-icons/io5";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import Modal from "../components/ui/Modal";
import { EmptyState } from "../components/ui/StatePanels";
import PlaylistFilters from "../components/playlist/PlaylistFilters";
import { useLibrary } from "../context/LibraryContext";
import { usePlayer } from "../context/PlayerContext";
import { useUI } from "../context/UIContext";
import playlistService from "../services/playlistService";
import { songId, normalizeSong, formatTime } from "../lib/media";

/** Format total seconds into human readable duration string */
function formatTotalDuration(seconds = 0) {
  if (!seconds || isNaN(seconds)) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} mins`;
}

/** Client-side release year detection matching backend heuristics */
function detectSongYear(song) {
  if (!song) return null;
  if (song.release_year) {
    const y = parseInt(song.release_year, 10);
    if (!isNaN(y) && y >= 1950 && y <= 2099) return y;
  }
  if (song.releaseYear) {
    const y = parseInt(song.releaseYear, 10);
    if (!isNaN(y) && y >= 1950 && y <= 2099) return y;
  }
  if (song.year) {
    const y = parseInt(song.year, 10);
    if (!isNaN(y) && y >= 1950 && y <= 2099) return y;
  }
  const thumb = String(song.thumbnail_url || "");
  const title = String(song.title || "");

  const fnMatch = thumb.match(/[-_](?:[A-Za-z]+[-_])?(20\d{2})[-_]/);
  if (fnMatch) return parseInt(fnMatch[1], 10);

  const titleMatch = title.match(/[\(\[\s](20\d{2})[\)\]\s]/);
  if (titleMatch) return parseInt(titleMatch[1], 10);

  const anyMatch = thumb.match(/(20\d{2})/);
  if (anyMatch) return parseInt(anyMatch[1], 10);

  return null;
}

const Playlist = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const {
    playlists,
    yearlyPlaylists,
    deletePlaylist,
    renamePlaylist,
    removeSongFromPlaylist,
    reorderPlaylist,
  } = useLibrary();
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();

  const [loading, setLoading] = useState(true);
  const [remotePlaylist, setRemotePlaylist] = useState(null);
  const [error, setError] = useState(false);

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedSort, setSelectedSort] = useState("default");

  // Edit modal & options menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const menuRef = useRef(null);

  const isYearlyParam = id?.startsWith("year-") || /^\d{4}$/.test(id);

  // Find in local context first
  const localPlaylist = useMemo(() => {
    if (isYearlyParam) {
      return yearlyPlaylists.find(
        (p) => p.id === id || p.name === id || `year-${p.year}` === id || `year-${p.name}` === id
      );
    }
    return playlists.find((p) => (p.id || p._id) === id);
  }, [id, isYearlyParam, playlists, yearlyPlaylists]);

  // Fetch playlist data
  const loadPlaylist = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      if (isYearlyParam) {
        const year = id.replace(/^year-/, "");
        const res = await playlistService.getYear(year);
        if (res) {
          setRemotePlaylist(res);
        } else {
          setError(true);
        }
      } else {
        if (!localPlaylist) {
          const res = await playlistService.getById(id);
          if (res) setRemotePlaylist(res);
          else setError(true);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, isYearlyParam, localPlaylist]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const playlist = remotePlaylist || localPlaylist;
  const isCurated =
    playlist?.isCurated ||
    id?.startsWith("spotlight-") ||
    id?.startsWith("curated-") ||
    id?.startsWith("category-") ||
    id === "fresh" ||
    id === "trending";
  const isYearly = isYearlyParam || playlist?.isYearly;
  const isSystemPlaylist = isYearly || isCurated;

  // Raw songs from playlist
  const allSongs = useMemo(() => (playlist?.songs || []).map(normalizeSong), [playlist]);

  // Extract available languages dynamically
  const availableLanguages = useMemo(() => {
    const langs = new Set();
    allSongs.forEach((s) => {
      if (s.language && s.language !== "Unknown" && s.language.trim()) {
        langs.add(s.language.trim());
      }
    });
    return Array.from(langs).sort();
  }, [allSongs]);

  // Extract available years dynamically from songs
  const availableYears = useMemo(() => {
    const years = new Set();
    allSongs.forEach((s) => {
      const yr = detectSongYear(s);
      if (yr) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allSongs]);

  // Multi-faceted Filtering + Search + Sorting (Non-destructive)
  const filteredSongs = useMemo(() => {
    let list = [...allSongs];

    // 1. Text Search (Title, Artist, Album, Language)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const titleMatch = (s.title || "").toLowerCase().includes(q);
        const artistMatch = (s.artist || "").toLowerCase().includes(q);
        const albumMatch = (s.album || "").toLowerCase().includes(q);
        const langMatch = (s.language || "").toLowerCase().includes(q);
        return titleMatch || artistMatch || albumMatch || langMatch;
      });
    }

    // 2. Language Filter
    if (selectedLanguage && selectedLanguage !== "all") {
      const targetLang = selectedLanguage.toLowerCase();
      list = list.filter((s) => (s.language || "").toLowerCase() === targetLang);
    }

    // 3. Year Filter
    if (selectedYear && selectedYear !== "all") {
      const targetYr = parseInt(selectedYear, 10);
      list = list.filter((s) => detectSongYear(s) === targetYr);
    }

    // 4. Sorting
    if (selectedSort === "title_asc") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (selectedSort === "title_desc") {
      list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    } else if (selectedSort === "artist_asc") {
      list.sort((a, b) => (a.artist || "").localeCompare(b.artist || ""));
    } else if (selectedSort === "artist_desc") {
      list.sort((a, b) => (b.artist || "").localeCompare(a.artist || ""));
    } else if (selectedSort === "duration_asc") {
      list.sort((a, b) => (a.duration || 210) - (b.duration || 210));
    } else if (selectedSort === "duration_desc") {
      list.sort((a, b) => (b.duration || 210) - (a.duration || 210));
    }

    return list;
  }, [allSongs, searchQuery, selectedLanguage, selectedYear, selectedSort]);

  // Total duration
  const totalSeconds = useMemo(() => {
    return allSongs.reduce((acc, s) => acc + (s.duration || 210), 0);
  }, [allSongs]);

  // 4-thumbnail collage if available
  const collage = useMemo(() => {
    if (Array.isArray(playlist?.collage) && playlist.collage.length >= 4) {
      return playlist.collage;
    }
    const thumbs = [];
    const seen = new Set();
    for (const s of allSongs) {
      if (s.thumbnail_url && !seen.has(s.thumbnail_url)) {
        seen.add(s.thumbnail_url);
        thumbs.push(s.thumbnail_url);
        if (thumbs.length === 4) break;
      }
    }
    return thumbs.length >= 4 ? thumbs : null;
  }, [playlist, allSongs]);

  const coverImage = playlist?.coverImage || (!collage && allSongs[0]?.thumbnail_url);

  // Check if current playlist is currently playing
  const isPlaylistActive = useMemo(() => {
    if (!currentSong || allSongs.length === 0) return false;
    return allSongs.some((s) => songId(s) === songId(currentSong));
  }, [currentSong, allSongs]);

  const handlePlayAll = () => {
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    if (list.length === 0) return;
    if (isPlaylistActive) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(list[0], list, 0);
    }
  };

  const handleShuffle = () => {
    const list = filteredSongs.length > 0 ? filteredSongs : allSongs;
    if (list.length === 0) return;
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    playSong(shuffled[0], shuffled, 0);
  };

  const openEdit = () => {
    setName(playlist.name || playlist.title || "");
    setDescription(playlist.description || "");
    setEditOpen(true);
    setMenuOpen(false);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    renamePlaylist(playlist.id || playlist._id, {
      name: name.trim() || playlist.name,
      description: description.trim(),
    });
    setEditOpen(false);
    toast("Playlist details updated", "success");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Sangeet — ${playlist.name}`,
          text: `Listen to "${playlist.name}" on Sangeet`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast("Playlist link copied to clipboard!", "success");
    }
    setMenuOpen(false);
  };

  const moveSong = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= allSongs.length) return;
    const reordered = [...allSongs];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderPlaylist(playlist.id || playlist._id, reordered);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedLanguage("all");
    setSelectedYear("all");
    setSelectedSort("default");
  };

  // Loading skeleton
  if (loading && !playlist) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Skeleton hero */}
        <div className="relative flex flex-col sm:flex-row gap-6 p-6 sm:p-8 rounded-3xl border border-white/[0.06] bg-[#111112]">
          <div className="skeleton aspect-square w-40 sm:w-52 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-4 pt-2">
            <div className="skeleton h-5 w-24 rounded-full" />
            <div className="skeleton h-10 w-3/4 rounded-xl" />
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="flex gap-3 pt-4">
              <div className="skeleton h-12 w-32 rounded-full" />
              <div className="skeleton h-12 w-12 rounded-full" />
            </div>
          </div>
        </div>
        {/* Skeleton rows */}
        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-[#101011] p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <div className="skeleton h-4 w-6 rounded" />
              <div className="skeleton h-12 w-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-3 w-1/4 rounded" />
              </div>
              <div className="skeleton h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !playlist) {
    return (
      <div className="py-12 animate-fade-in">
        <EmptyState
          title="Couldn't load this playlist"
          description="The playlist might have been removed, or there was a network issue."
          action={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadPlaylist}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg transition hover:scale-105"
              >
                <IoRefreshOutline className="text-base" /> Retry
              </button>
              <button
                type="button"
                onClick={() => navigate("/library")}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Back to Library
              </button>
            </div>
          }
        />
      </div>
    );
  }

  const isUserPlaylistPure =
    !isYearly &&
    selectedSort === "default" &&
    !searchQuery.trim() &&
    selectedLanguage === "all" &&
    selectedYear === "all";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Premium Hero Header ── */}
      <header className="animate-playlist-hero relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#1c1c1f]/95 via-[#121214] to-[#0c0c0d] p-6 shadow-2xl sm:p-8">
        {/* Blurred background artwork layer */}
        <div
          className="absolute inset-0 -z-10 opacity-25 blur-3xl scale-125 transition-all duration-700 pointer-events-none"
          style={{
            backgroundImage: coverImage ? `url(${coverImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0c0c0d] via-[#0c0c0d]/60 to-transparent pointer-events-none" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end md:gap-8">
          {/* Artwork / 4-Quadrant Collage */}
          <div className="relative aspect-square w-36 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-[#161618] shadow-2xl sm:w-48 md:w-56 group">
            {collage ? (
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
                {collage.slice(0, 4).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ))}
              </div>
            ) : coverImage ? (
              <img
                src={coverImage}
                alt={playlist.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-500/20 via-[#18181a] to-[#0d0d0e] text-center p-4">
                {isYearly ? (
                  <>
                    <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight">
                      {playlist.name}
                    </span>
                    <span className="mt-1 text-[11px] font-bold text-amber-400/70 tracking-widest uppercase">
                      Yearly Music
                    </span>
                  </>
                ) : (
                  <IoMusicalNotes className="text-4xl sm:text-5xl text-white/30" />
                )}
              </div>
            )}
          </div>

          {/* Playlist Metadata & Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  isSystemPlaylist
                    ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border border-white/15 bg-white/5 text-white/75"
                }`}
              >
                {isYearly ? (
                  <>
                    <IoSparkles className="text-xs text-amber-300" /> Smart Yearly Playlist
                  </>
                ) : isCurated ? (
                  <>
                    <IoSparkles className="text-xs text-amber-300" /> Curated Collection
                  </>
                ) : (
                  "Playlist"
                )}
              </span>
            </div>

            <h1
              className="mt-2 truncate text-2xl font-extrabold text-white sm:text-3xl md:text-4xl lg:text-5xl tracking-tight leading-none"
              title={playlist.name || playlist.title}
            >
              {playlist.name || playlist.title}
            </h1>

            {playlist.description && (
              <p className="mt-2.5 line-clamp-2 text-xs text-white/60 sm:text-sm leading-relaxed">
                {playlist.description}
              </p>
            )}

            {/* Creator, Count & Duration Metadata */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/50 sm:text-sm">
              <span className="font-semibold text-white/90">
                {playlist.owner || (isSystemPlaylist ? "Sangeet Curated" : "You")}
              </span>
              <span>•</span>
              <span>
                {allSongs.length} {allSongs.length === 1 ? "song" : "songs"}
              </span>
              {totalSeconds > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <IoTimeOutline className="text-sm text-white/40" />
                    {formatTotalDuration(totalSeconds)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Notice Banner for System Playlists ── */}
      {isSystemPlaylist && (
        <div className="animate-fade-in flex items-center gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] px-4 py-2.5 text-xs text-amber-200/80">
          <IoInformationCircleOutline className="text-base text-amber-400 shrink-0" />
          <span>
            {isYearly
              ? "Songs are automatically aggregated by release year across the entire Sangeet catalog."
              : "Official Sangeet curated collection. Enjoy full in-playlist search, dynamic filters, and continuous playback."}
          </span>
        </div>
      )}

      {/* ── Action Transport Bar ── */}
      <div className="flex items-center gap-3 py-1 animate-playlist-hero-delay-1">
        {/* Play All Button */}
        <button
          type="button"
          disabled={allSongs.length === 0}
          onClick={handlePlayAll}
          className="flex items-center gap-2.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPlaylistActive && isPlaying ? (
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
          disabled={allSongs.length === 0}
          onClick={handleShuffle}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/75 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Shuffle play"
        >
          <IoShuffle className="text-xl" />
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share playlist"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/75 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          <IoShareSocialOutline className="text-lg" />
        </button>

        {/* More Options (For user-owned playlists) */}
        {!isSystemPlaylist && (
          <div className="relative ml-auto" ref={menuRef}>
            <button
              type="button"
              aria-label="More options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/60 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
            >
              <IoEllipsisHorizontal className="text-lg" />
            </button>

            {menuOpen && (
              <div className="animate-scale-in absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1c] py-1.5 shadow-2xl shadow-black/80 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={openEdit}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <IoPencilOutline className="text-amber-400 text-sm" /> Edit details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deletePlaylist(playlist.id || playlist._id);
                    navigate("/library");
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                >
                  <IoTrashOutline className="text-sm" /> Delete playlist
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Search, Filter & Sorting Bar ── */}
      {allSongs.length > 0 && (
        <div className="animate-playlist-hero-delay-2">
          <PlaylistFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            availableLanguages={availableLanguages}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            availableYears={availableYears}
            selectedSort={selectedSort}
            onSortChange={setSelectedSort}
            totalCount={allSongs.length}
            filteredCount={filteredSongs.length}
            onClearAll={clearAllFilters}
          />
        </div>
      )}

      {/* ── Song List / Track Table ── */}
      {allSongs.length === 0 ? (
        <EmptyState
          title={isYearly ? `No music from ${playlist.name} yet` : "This playlist is empty"}
          description={
            isYearly
              ? `New ${playlist.name} releases will automatically appear here once added to Sangeet.`
              : "Find songs you love and tap the ••• menu to add them here."
          }
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
      ) : filteredSongs.length === 0 ? (
        <EmptyState
          title="No matching songs"
          description="Try adjusting your search terms or clearing active filters."
          action={
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101011] shadow-xl">
          {/* Table Header — Desktop */}
          <div className="hidden grid-cols-[3rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_4rem_3rem] items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40 md:grid bg-white/[0.01]">
            <span className="text-center">#</span>
            <span>Title</span>
            <span>Artist</span>
            <span>Language</span>
            <span className="text-right">Time</span>
            <span className="text-center">Like</span>
          </div>

          {/* Song Rows */}
          <div className="divide-y divide-white/[0.03]">
            {filteredSongs.map((song, i) => (
              <PlaylistTrackRow
                key={songId(song) || i}
                song={song}
                queue={filteredSongs}
                index={i}
                isUserPlaylist={isUserPlaylistPure}
                onMoveUp={() => moveSong(i, -1)}
                onMoveDown={() => moveSong(i, 1)}
                onRemove={() => removeSongFromPlaylist(playlist.id || playlist._id, song)}
                canMoveUp={i > 0}
                canMoveDown={i < allSongs.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Edit Playlist Modal ── */}
      {!isSystemPlaylist && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit playlist">
          <form onSubmit={saveEdit} className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="text-caption mb-1.5 block">
                Name <span className="text-amber-400">*</span>
              </label>
              <input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Playlist name"
                className="w-full rounded-xl border border-white/10 bg-[#0e0e0f] px-3.5 py-2.5 text-sm text-white transition focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-desc" className="text-caption mb-1.5 block">
                Description (optional)
              </label>
              <textarea
                id="edit-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add an optional description..."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0e0e0f] px-3.5 py-2.5 text-sm text-white transition focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-br from-amber-300 to-amber-500 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-[1.02]"
            >
              Save Changes
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// Rich table song row component
const PlaylistTrackRow = ({
  song,
  queue,
  index,
  isUserPlaylist,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}) => {
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const isActive = currentSong && songId(currentSong) === songId(song);
  const liked = isLiked(song);

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isActive) {
      setIsPlaying(!isPlaying);
    } else {
      playSong(song, queue, index);
    }
  };

  return (
    <div
      className={`group flex items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-white/[0.04] md:grid md:grid-cols-[3rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_4rem_3rem] md:px-4 ${
        isActive ? "bg-amber-400/[0.06] animate-pulse-glow" : ""
      }`}
    >
      {/* Index / Play button trigger */}
      <div className="flex w-7 items-center justify-center shrink-0 md:w-auto">
        <button
          type="button"
          onClick={handlePlay}
          aria-label={isActive && isPlaying ? "Pause" : "Play"}
          className="flex h-7 w-7 items-center justify-center text-xs font-semibold tabular-nums text-white/40 transition hover:text-white"
        >
          {isActive ? (
            <span className="text-amber-400">
              {isPlaying ? (
                <span className="eq-bars">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <IoPlay className="text-base translate-x-0.5" />
              )}
            </span>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <IoPlay className="hidden text-base group-hover:block translate-x-0.5 text-white" />
            </>
          )}
        </button>
      </div>

      {/* Artwork + Title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={handlePlay}
          onKeyDown={(e) => e.key === "Enter" && handlePlay(e)}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg cursor-pointer"
        >
          <img
            src={song.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <IoPlay className="text-white text-base translate-x-0.5" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handlePlay}
            className={`block truncate text-left text-sm font-semibold leading-snug hover:underline ${
              isActive ? "text-amber-300 font-bold" : "text-white"
            }`}
          >
            {song.title}
          </button>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-white/45 md:hidden">
            <Link
              to={`/artist/${encodeURIComponent(song.artist)}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate hover:text-white transition-colors"
            >
              {song.artist}
            </Link>
            {song.language && (
              <>
                <span>•</span>
                <span>{song.language}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Artist Column (Desktop) */}
      <div className="hidden min-w-0 md:block">
        <Link
          to={`/artist/${encodeURIComponent(song.artist)}`}
          className="truncate text-xs text-white/55 hover:text-white transition-colors block"
          title={song.artist}
        >
          {song.artist}
        </Link>
      </div>

      {/* Language Column (Desktop) */}
      <div className="hidden min-w-0 md:block">
        <span className="inline-block truncate rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/40">
          {song.language || "—"}
        </span>
      </div>

      {/* Duration */}
      <div className="hidden text-right text-xs tabular-nums text-white/40 md:block">
        {formatTime(song.duration || 210)}
      </div>

      {/* Actions: Like + User Playlist Reorder/Remove */}
      <div className="flex items-center justify-end gap-1 shrink-0">
        <button
          type="button"
          aria-label={liked ? "Unlike" : "Like"}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song);
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:scale-110 ${
            liked ? "text-amber-400" : "text-white/30 hover:text-amber-300"
          }`}
        >
          {liked ? <IoMdHeart /> : <IoMdHeartEmpty />}
        </button>

        {isUserPlaylist && (
          <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              aria-label="Move song up"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-20"
            >
              <IoArrowUp className="text-xs" />
            </button>
            <button
              type="button"
              aria-label="Move song down"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-20"
            >
              <IoArrowDown className="text-xs" />
            </button>
            <button
              type="button"
              aria-label="Remove from playlist"
              onClick={onRemove}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <IoRemoveCircleOutline className="text-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlist;
