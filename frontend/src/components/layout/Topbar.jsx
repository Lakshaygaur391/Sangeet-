import { useState, useMemo, useEffect, useRef } from "react";
import { IoIosSearch } from "react-icons/io";
import { IoLogOutOutline, IoMenuOutline } from "react-icons/io5";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import songService from "../../services/songService";
import { normalizeSong, scoreSongMatch, avatarFor } from "../../lib/media";

const Topbar = () => {
  const { searchQuery, setSearchQuery, playSong } = usePlayer();
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search suggestions from API when query changes
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const results = await songService.search(q);
        if (!cancelled) {
          setSearchResults(Array.isArray(results) ? results.map(normalizeSong) : []);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const artistResults = useMemo(() => {
    if (!searchQuery.trim() || searchResults.length === 0) return [];
    const q = searchQuery.toLowerCase();
    const artistMap = new Map();
    for (const song of searchResults) {
      const name = (song.artist || "").trim();
      if (!name || name === "Unknown Artist") continue;
      const key = name.toLowerCase();
      if (key.includes(q) && !artistMap.has(key)) {
        artistMap.set(key, {
          id: `artist-${name}`,
          type: "artist",
          name,
          image: avatarFor(name),
        });
      }
    }
    return Array.from(artistMap.values()).slice(0, 4);
  }, [searchResults, searchQuery]);

  const songResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchResults.slice(0, 6).map((s) => ({ ...s, type: "song" }));
  }, [searchResults, searchQuery]);

  const rows = [...songResults, ...artistResults];

  const handleSelectSong = (song, index) => {
    if (!isAuthenticated) {
      setIsOpen(false);
      openAuthPrompt("default");
      return;
    }
    playSong(song, searchResults.length > 0 ? searchResults : [song], index);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleSelectArtist = (name) => {
    setSearchQuery("");
    setIsOpen(false);
    navigate(`/artist/${encodeURIComponent(name)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsOpen(false);
    navigate("/search");
  };

  return (
    <nav className="relative flex items-center justify-between gap-3 px-4 py-4 text-white md:gap-4">
      <Link to="/" className="flex shrink-0 flex-col leading-none">

        <span className="mt-1 rounded-lg border-2 border-amber-500/20 text-lg font-black tracking-[0.18em] text-white/95 md:text-xl">
          SANGEET
        </span>
      </Link>

      <form ref={searchContainerRef} onSubmit={handleSubmit} className="relative w-full max-w-[620px] md:w-[36%] md:min-w-[260px]">
        <div className="flex items-center rounded-full border border-white/10 bg-[#1c1c1e] shadow-[0_0_0_2px_rgba(255,255,255,0.06)] transition focus-within:border-amber-500/60 focus-within:shadow-[0_0_0_2px_rgba(234,179,74,0.35)]">
          <div className="pl-3 pr-2 text-xl text-white/70 md:pl-4">
            <IoIosSearch />
          </div>
          <input
            type="text"
            aria-label="Search songs and artists"
            className="w-full rounded-full bg-transparent py-2.5 pr-2 text-sm text-white placeholder:text-white/45 focus:outline-none md:py-3 md:text-base"
            placeholder="Search songs, artists"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="mr-3 text-lg text-white/50 hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        {isOpen && searchQuery && rows.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-[24px] border border-white/10 bg-[#161616]/97 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="max-h-[380px] overflow-y-auto">
              {rows.map((item, index) =>
                item.type === "artist" ? (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectArtist(item.name)}
                    className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <img src={item.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-white/40">Artist</p>
                    </div>
                  </button>
                ) : (
                  <button
                    key={item._id || `${item.title}-${index}`}
                    type="button"
                    onClick={() => handleSelectSong(item, index)}
                    className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <img src={item.thumbnail_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                      <p className="truncate text-xs text-white/40">{item.artist}</p>
                    </div>
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/search");
              }}
              className="w-full border-t border-white/5 bg-white/[0.02] py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-amber-300 hover:bg-white/5"
            >
              See all results
            </button>
          </div>
        )}
      </form>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <NavLink to="/about" className={({ isActive }) => `nav-link !border-0 !bg-transparent !px-2.5 !py-1.5 !normal-case !tracking-normal ${isActive ? "!text-amber-300" : "!text-white/55 hover:!text-white"}`}>
          About
        </NavLink>
        <button
          type="button"
          onClick={() => toast("Support is on the way — email us soon.", "info")}
          className="nav-link !border-0 !bg-transparent !px-2.5 !py-1.5 !normal-case !tracking-normal !text-white/55 hover:!text-white"
        >
          Support
        </button>
        <button
          type="button"
          onClick={() => toast("The Sangeet app isn't available yet — coming soon.", "info")}
          className="nav-link !border-0 !bg-transparent !px-2.5 !py-1.5 !normal-case !tracking-normal !text-white/55 hover:!text-white"
        >
          Download
        </button>

        {isAuthenticated ? (
          <div className="ml-2 flex items-center gap-3 border-l border-white/10 pl-4">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <img src={avatarFor(user?.name || "User", "eab34a&color=000")} alt="" className="h-6 w-6 rounded-full object-cover" />
              <span className="max-w-[100px] truncate text-xs font-semibold text-white/90">{user?.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/");
              }}
              aria-label="Log out"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500/20"
            >
              <IoLogOutOutline className="text-base" />
            </button>
          </div>
        ) : (
          <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-4">
            <button
              type="button"
              onClick={() => openAuthPrompt("default")}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-white/75 transition hover:text-white"
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Log in
            </button>
          </div>
        )}
      </div>

      {/* Mobile: compact auth affordance + overflow menu */}
      <div className="flex shrink-0 items-center gap-2 md:hidden">
        {isAuthenticated ? (
          <img src={avatarFor(user?.name || "User", "eab34a&color=000")} alt="" className="h-8 w-8 rounded-full border border-white/10 object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black"
          >
            Log in
          </button>
        )}
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70"
        >
          <IoMenuOutline className="text-lg" />
        </button>

        {mobileMenuOpen && (
          <div className="absolute right-3 top-16 z-50 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#161616]/98 py-1.5 shadow-xl backdrop-blur-xl">
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthPrompt("default");
                }}
                className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-amber-300 hover:bg-white/5"
              >
                Sign up free
              </button>
            )}
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5">
              About
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                toast("Support is on the way — email us soon.", "info");
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5"
            >
              Support
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                toast("The Sangeet app isn't available yet — coming soon.", "info");
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5"
            >
              Download
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate("/");
                }}
                className="block w-full px-4 py-2.5 text-left text-sm text-rose-300 hover:bg-white/5"
              >
                Log out
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Topbar;
