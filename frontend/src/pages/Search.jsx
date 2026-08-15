import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { IoIosSearch } from "react-icons/io";
import { IoClose, IoTimeOutline, IoTrashOutline } from "react-icons/io5";
import SongCard from "../components/song/SongCard";
import ArtistCard from "../components/artist/ArtistCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import { EmptyState } from "../components/ui/StatePanels";
import { SkeletonGrid } from "../components/ui/Skeleton";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService from "../services/songService";
import { normalizeSong, scoreSongMatch, avatarFor } from "../lib/media";

const RECENT_SEARCHES_KEY = "sangeet_recent_searches";
const LANGUAGES = ["Hindi", "Punjabi", "Haryanvi", "Bhojpuri", "English", "Tamil", "Telugu", "Marathi", "Kannada", "Malayalam"];

function loadRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery, setSearchQuery, playSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const [catalog, setCatalog] = useState([]);
  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [status, setStatus] = useState("loading");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  // Sync URL query param if present
  useEffect(() => {
    const urlQ = searchParams.get("q");
    if (urlQ && urlQ !== searchQuery) {
      setSearchQuery(urlQ);
    }
  }, [searchParams]);

  // Load complete catalog independently of player active queue
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      const songs = await songService.getAll();
      if (cancelled) return;
      if (songs === null) return setStatus("error");
      setCatalog(Array.isArray(songs) ? songs.map(normalizeSong) : []);
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounce the query
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchQuery.trim();
      setDebouncedQuery(trimmed);
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery, setSearchParams]);

  // Live backend search on debounced query
  useEffect(() => {
    if (!debouncedQuery) {
      setApiSearchResults([]);
      return;
    }
    let cancelled = false;
    async function fetchApiSearch() {
      try {
        const results = await songService.search(debouncedQuery);
        if (!cancelled && Array.isArray(results)) {
          setApiSearchResults(results.map(normalizeSong));
        }
      } catch {
        if (!cancelled) setApiSearchResults([]);
      }
    }
    fetchApiSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const saveRecentSearch = useCallback((q) => {
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 8);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!debouncedQuery) return;
    const t = setTimeout(() => saveRecentSearch(debouncedQuery), 900);
    return () => clearTimeout(t);
  }, [debouncedQuery, saveRecentSearch]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Merge catalog search with API search results
  const songResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const seen = new Set();
    const list = [];

    // First, scored matches from full catalog
    const scoredCatalog = catalog
      .map((s) => ({ ...s, score: scoreSongMatch(s, debouncedQuery) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const s of scoredCatalog) {
      const key = (s.audio_url || s._id || s.title).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    }

    // Second, any additional API search matches
    for (const s of apiSearchResults) {
      const key = (s.audio_url || s._id || s.title).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    }

    return list;
  }, [catalog, apiSearchResults, debouncedQuery]);

  const artistResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase();
    const allKnown = [...catalog, ...apiSearchResults];
    const artistMap = new Map();

    for (const s of allKnown) {
      const name = (s.artist || "").trim();
      if (!name || name === "Unknown Artist") continue;
      const key = name.toLowerCase();
      if (key.includes(q) && !artistMap.has(key)) {
        artistMap.set(key, {
          name,
          image: avatarFor(name),
          songs: allKnown.filter((song) => song.artist === name),
        });
      }
    }

    return Array.from(artistMap.values()).slice(0, 8);
  }, [catalog, apiSearchResults, debouncedQuery]);

  const languageResults = useMemo(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase();
    return LANGUAGES.filter((l) => l.toLowerCase().includes(q));
  }, [debouncedQuery]);

  const hasQuery = Boolean(debouncedQuery);
  const hasResults = songResults.length > 0 || artistResults.length > 0 || languageResults.length > 0;

  return (
    <div className="space-y-5">
      <div className="relative">
        <div className="flex items-center rounded-full border border-white/10 bg-[#1c1c1e] px-4 py-3 focus-within:border-amber-500/60">
          <IoIosSearch className="mr-2 text-xl text-white/60" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, languages…"
            aria-label="Search"
            className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className="text-white/50 hover:text-white">
              <IoClose className="text-xl" />
            </button>
          )}
        </div>
      </div>

      {!hasQuery && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h2 text-white">Recent Searches</h2>
            {recentSearches.length > 0 && (
              <button type="button" onClick={clearRecentSearches} className="flex items-center gap-1 text-xs font-medium text-white/40 hover:text-rose-300">
                <IoTrashOutline /> Clear
              </button>
            )}
          </div>
          {recentSearches.length === 0 ? (
            <EmptyState icon={<IoTimeOutline />} title="No recent searches" description="Songs and artists you look up will show up here." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSearchQuery(q)}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <h2 className="text-h2 mt-8 mb-3 text-white">Browse by Language</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSearchQuery(lang)}
                className="rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-1.5 text-sm text-amber-200 transition hover:bg-amber-400/10"
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasQuery && status === "loading" && <SkeletonGrid count={8} />}
      {hasQuery && status === "error" && (
        <EmptyState title="Search is unavailable" description="Couldn't reach the server. Check your connection and try again." />
      )}

      {hasQuery && status === "ready" && !hasResults && (
        <EmptyState
          title={`No results for "${debouncedQuery}"`}
          description="Try a different spelling, or browse by language below."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {LANGUAGES.slice(0, 4).map((l) => (
                <button key={l} type="button" onClick={() => setSearchQuery(l)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
                  {l}
                </button>
              ))}
            </div>
          }
        />
      )}

      {hasQuery && status === "ready" && hasResults && (
        <div className="space-y-6">
          {languageResults.length > 0 && (
            <div>
              <h2 className="text-h2 mb-2 text-white">Languages</h2>
              <div className="flex flex-wrap gap-2">
                {languageResults.map((l) => (
                  <span key={l} className="rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3.5 py-1.5 text-sm text-amber-200">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {songResults.length > 0 && (
            <div>
              <h2 className="text-h2 mb-3 text-white">Songs</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {songResults.map((song, i) => (
                  <SongCard key={song._id || i} song={song} queue={songResults} index={i} onAddToPlaylist={setAddToPlaylistSong} />
                ))}
              </div>
            </div>
          )}

          {artistResults.length > 0 && (
            <div>
              <h2 className="text-h2 mb-3 text-white">Artists</h2>
              <div className="scrollbar-none flex gap-3 overflow-x-auto md:gap-4">
                {artistResults.map((artist) => (
                  <ArtistCard key={artist.name} artist={artist} onPlay={() => {
                    if (!isAuthenticated) { openAuthPrompt("default"); return; }
                    playSong(artist.songs[0], artist.songs, 0);
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />
    </div>
  );
};

export default Search;
