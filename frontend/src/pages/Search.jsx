import { useEffect, useMemo, useState, useCallback, useRef, useDeferredValue } from "react";
import { useSearchParams } from "react-router-dom";
import { IoIosSearch } from "react-icons/io";
import { IoClose, IoTimeOutline, IoTrashOutline } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import SongCard from "../components/song/SongCard";
import ArtistCard from "../components/artist/ArtistCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import { EmptyState } from "../components/ui/StatePanels";
import { SkeletonGrid } from "../components/ui/Skeleton";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService, { getCachedSearchResults } from "../services/songService";
import { normalizeSong, scoreSongMatch, avatarFor } from "../lib/media";

const RECENT_SEARCHES_KEY = "sangeet_recent_searches";
const LANGUAGES = [
  "Hindi",
  "Punjabi",
  "Haryanvi",
  "Bhojpuri",
  "English",
  "Tamil",
  "Telugu",
  "Marathi",
  "Kannada",
  "Malayalam",
];

function loadRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { playSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const initialParamQuery = searchParams.get("q") || "";
  const [inputQuery, setInputQuery] = useState(initialParamQuery);

  // useDeferredValue ensures high-priority instantaneous typing while search compute is deferred
  const deferredQuery = useDeferredValue(inputQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialParamQuery);

  const [searchResults, setSearchResults] = useState(() => {
    if (initialParamQuery) {
      const cached = getCachedSearchResults(initialParamQuery);
      return cached ? cached.map(normalizeSong) : [];
    }
    return [];
  });

  const [status, setStatus] = useState(initialParamQuery ? "loading" : "idle");
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  const abortControllerRef = useRef(null);

  // Synchronize when URL search param changes externally (e.g. browser back/forward)
  useEffect(() => {
    const urlQ = (searchParams.get("q") || "").trim();
    if (urlQ !== inputQuery.trim()) {
      setInputQuery(urlQ);
    }
  }, [searchParams]);

  // Debounce API search query & URL param update (300ms) to avoid re-rendering router on every key
  useEffect(() => {
    const trimmed = inputQuery.trim();
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputQuery, setSearchParams]);

  // Live search execution with cache and AbortController
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setSearchResults([]);
      setStatus("idle");
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    // Check client-side instant cache first (0ms latency)
    const cached = getCachedSearchResults(q);
    if (cached) {
      setSearchResults(cached.map(normalizeSong));
      setStatus("ready");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");

    async function fetchResults() {
      try {
        const results = await songService.search(q, controller.signal);
        if (controller.signal.aborted) return;
        if (results === null) {
          setStatus("error");
          return;
        }
        setSearchResults(Array.isArray(results) ? results.map(normalizeSong) : []);
        setStatus("ready");
      } catch (err) {
        if (!controller.signal.aborted) {
          setStatus("error");
        }
      }
    }

    fetchResults();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  // Persist recent searches on debounced query
  const saveRecentSearch = useCallback((q) => {
    const trimmed = (q || "").trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const next = [
        trimmed,
        ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 8);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!debouncedQuery) return;
    const t = setTimeout(() => saveRecentSearch(debouncedQuery), 1200);
    return () => clearTimeout(t);
  }, [debouncedQuery, saveRecentSearch]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const removeSingleRecentSearch = (e, itemToRemove) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== itemToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Deferred ranking calculation so input typing is never blocked
  const activeQuery = deferredQuery.trim();

  const songResults = useMemo(() => {
    if (!activeQuery || !searchResults.length) return [];
    return [...searchResults].sort((a, b) => {
      const scoreA = scoreSongMatch(a, activeQuery);
      const scoreB = scoreSongMatch(b, activeQuery);
      return scoreB - scoreA;
    });
  }, [searchResults, activeQuery]);

  // Artist grouping and ranking
  const artistResults = useMemo(() => {
    if (!activeQuery || !searchResults.length) return [];
    const q = activeQuery.toLowerCase();
    const artistMap = new Map();

    for (const song of searchResults) {
      const rawArtist = (song.artist || "").trim();
      if (!rawArtist || rawArtist === "Unknown Artist") continue;

      const artistTokens = rawArtist
        .split(/[,&/]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const candidateNames = artistTokens.length > 0 ? artistTokens : [rawArtist];

      for (const name of candidateNames) {
        const key = name.toLowerCase();
        if (!key.includes(q)) continue;

        if (!artistMap.has(key)) {
          artistMap.set(key, {
            name,
            image: avatarFor(name),
            songs: [],
          });
        }
        artistMap.get(key).songs.push(song);
      }
    }

    return Array.from(artistMap.values()).slice(0, 8);
  }, [searchResults, activeQuery]);

  // Language matches
  const languageResults = useMemo(() => {
    if (!activeQuery) return [];
    const q = activeQuery.toLowerCase();
    return LANGUAGES.filter((l) => l.toLowerCase().includes(q));
  }, [activeQuery]);

  const hasQuery = Boolean(inputQuery.trim());
  const isLoading = status === "loading";
  const hasResults =
    songResults.length > 0 ||
    artistResults.length > 0 ||
    languageResults.length > 0;

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="flex items-center rounded-full border border-white/10 bg-[#1c1c1e] px-4 py-3 shadow-[0_0_0_2px_rgba(255,255,255,0.06)] transition-all focus-within:border-amber-500/60 focus-within:shadow-[0_0_0_2px_rgba(234,179,74,0.35)]">
          <IoIosSearch className="mr-2 text-xl text-white/60 shrink-0" />
          <input
            autoFocus
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Search songs, artists, languages…"
            aria-label="Search"
            className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none text-base"
          />
          {isLoading && (
            <AiOutlineLoading3Quarters className="animate-spin mr-2 text-amber-400 text-base shrink-0" />
          )}
          {inputQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setInputQuery("");
                setDebouncedQuery("");
                setSearchResults([]);
                setStatus("idle");
              }}
              className="text-white/50 hover:text-white transition p-1"
            >
              <IoClose className="text-xl" />
            </button>
          )}
        </div>
      </div>

      {/* When no query is typed: Recent searches & Browse Languages */}
      {!hasQuery && (
        <div className="space-y-8 animate-fadeIn">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-h2 text-white font-semibold flex items-center gap-2">
                <IoTimeOutline className="text-amber-400" /> Recent Searches
              </h2>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="flex items-center gap-1 text-xs font-medium text-white/40 hover:text-rose-300 transition"
                >
                  <IoTrashOutline /> Clear All
                </button>
              )}
            </div>

            {recentSearches.length === 0 ? (
              <EmptyState
                icon={<IoTimeOutline />}
                title="No recent searches"
                description="Songs, artists, or languages you look up will show up here."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <div
                    key={q}
                    className="group inline-flex items-center rounded-full border border-white/10 bg-white/5 pl-3.5 pr-2 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:border-white/20"
                  >
                    <button
                      type="button"
                      onClick={() => setInputQuery(q)}
                      className="text-left hover:text-white"
                    >
                      {q}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${q} from recent searches`}
                      onClick={(e) => removeSingleRecentSearch(e, q)}
                      className="ml-2 text-white/30 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <IoClose className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-h2 mb-3 text-white font-semibold">Browse by Language</h2>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setInputQuery(lang)}
                  className="rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/15 hover:border-amber-400/40 hover:scale-105 active:scale-95"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading state when no previous results are displayed */}
      {hasQuery && isLoading && searchResults.length === 0 && (
        <SkeletonGrid count={8} />
      )}

      {/* Error state */}
      {hasQuery && status === "error" && (
        <EmptyState
          title="Search is temporarily unavailable"
          description="Couldn't connect to the server. Please check your network and try again."
        />
      )}

      {/* No results state */}
      {hasQuery && status === "ready" && !hasResults && (
        <EmptyState
          title={`No results for "${debouncedQuery}"`}
          description="Try a different spelling, artist name, or explore one of the languages below."
          action={
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {LANGUAGES.slice(0, 5).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setInputQuery(l)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  {l}
                </button>
              ))}
            </div>
          }
        />
      )}

      {/* Search results */}
      {hasQuery && hasResults && (
        <div className="space-y-8 animate-fadeIn">
          {/* Matched Languages */}
          {languageResults.length > 0 && (
            <div>
              <h2 className="text-h2 mb-2 text-white font-semibold">Languages</h2>
              <div className="flex flex-wrap gap-2">
                {languageResults.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setInputQuery(l)}
                    className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3.5 py-1.5 text-sm text-amber-200 hover:bg-amber-400/20 transition cursor-pointer"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Songs */}
          {songResults.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-h2 text-white font-semibold">
                  Songs ({songResults.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {songResults.map((song, i) => (
                  <SongCard
                    key={song._id || song.id || i}
                    song={song}
                    queue={songResults}
                    index={i}
                    onAddToPlaylist={setAddToPlaylistSong}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Matched Artists */}
          {artistResults.length > 0 && (
            <div>
              <h2 className="text-h2 mb-3 text-white font-semibold">
                Artists ({artistResults.length})
              </h2>
              <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2 md:gap-4">
                {artistResults.map((artist) => (
                  <ArtistCard
                    key={artist.name}
                    artist={artist}
                    onPlay={() => {
                      if (!isAuthenticated) {
                        openAuthPrompt("default");
                        return;
                      }
                      if (artist.songs?.length) {
                        playSong(artist.songs[0], artist.songs, 0);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AddToPlaylistModal
        song={addToPlaylistSong}
        onClose={() => setAddToPlaylistSong(null)}
      />
    </div>
  );
};

export default Search;