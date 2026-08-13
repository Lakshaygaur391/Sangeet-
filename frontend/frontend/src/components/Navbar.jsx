import { useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { IoLogOutOutline, IoPersonCircleOutline } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { usePlayer } from "./playerContext";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function Navbar() {
  const { searchQuery, setSearchQuery, songList, setCurrentVideoId, setCurrentIndex, setCurrentSong, setShowLoginModal } = usePlayer();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const getVideoIdFromUrl = (url) => {
    if (!url) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
    return url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1] || null;
  };

  const normalizeSong = (song) => {
    const plainSong = song?._doc || song || {};
    const youtubeUrl = (plainSong.youtube_url || plainSong.videoUrl || "").trim();
    const videoId = getVideoIdFromUrl(youtubeUrl);
    const thumbnailUrl = (plainSong.thumbnail_url || plainSong.image ||
      (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231f1f23'/%3E%3Cstop offset='100%25' stop-color='%230f0f12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%232a2a30'/%3E%3Cpath d='M190 170v60l50-30z' fill='%23f59e0b'/%3E%3C/svg%3E")).trim();

    return {
      ...plainSong,
      _id: plainSong._id || plainSong.id,
      id: plainSong.id || plainSong._id,
      title: String(plainSong.title || plainSong.name || "Unknown Song").trim(),
      artist: String(plainSong.artist || plainSong.singer || "Unknown Artist").trim(),
      youtube_url: youtubeUrl,
      thumbnail_url: thumbnailUrl,
    };
  };

  const scoreSongMatch = (song, query) => {
    const title = (song.title || "").toLowerCase();
    const artist = (song.artist || "").toLowerCase();
    const normalizedQuery = query.toLowerCase();

    let score = 0;
    if (title === normalizedQuery) score += 100;
    if (artist === normalizedQuery) score += 80;
    if (title.startsWith(normalizedQuery)) score += 30;
    if (artist.startsWith(normalizedQuery)) score += 25;
    if (title.includes(normalizedQuery)) score += 20;
    if (artist.includes(normalizedQuery)) score += 15;

    return score;
  };

  const artistResults = (searchQuery || "")
    ? [...new Map(
      songList
        .map((song) => normalizeSong(song))
        .filter((song) => song.artist && song.artist !== "Unknown Artist")
        .map((song) => [song.artist, {
          id: `artist-${song.artist}`,
          type: "artist",
          name: song.artist,
          image: `https://ui-avatars.com/api/?name=${encodeURIComponent(song.artist)}&background=random`,
        }])
    ).values()]
      .filter((artist) => artist.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const filteredResults = (searchQuery || "")
    ? songList
      .map((song) => normalizeSong(song))
      .filter((song) => {
        const title = (song.title || "").toLowerCase();
        const artist = (song.artist || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return title.includes(query) || artist.includes(query);
      })
      .map((song) => ({ ...song, type: "song", score: scoreSongMatch(song, searchQuery) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    : [];

  const resultRows = [...filteredResults.slice(0, 6), ...artistResults.slice(0, 4)];
  const directYoutubeFallback =
    (searchQuery || "").trim() && resultRows.length === 0
      ? {
        id: "youtube-search",
        type: "youtube",
        query: searchQuery.trim(),
      }
      : null;

  const handleSelectSong = async (song, index) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const normalizedSong = normalizeSong(song);
    const youtubeUrl = normalizedSong.youtube_url;
    let videoId = getVideoIdFromUrl(youtubeUrl);

    if (!videoId && normalizedSong.title && normalizedSong.artist) {
      try {
        const res = await fetch(
          `${API}/api/resolve-song?title=${encodeURIComponent(normalizedSong.title)}&artist=${encodeURIComponent(normalizedSong.artist)}`
        );
        const data = await res.json();
        videoId = getVideoIdFromUrl(data?.youtube_url || data?.videoId || "");
      } catch (err) {
        console.error("Unable to resolve song from search:", err);
        return;
      }
    }

    if (!videoId) return;

    const actualIndex = songList.findIndex((item) => {
      const current = normalizeSong(item);
      return (current._id && normalizedSong._id && current._id.toString() === normalizedSong._id.toString()) ||
        (current.title === normalizedSong.title && current.artist === normalizedSong.artist);
    });

    setCurrentSong({
      ...normalizedSong,
      youtube_url: youtubeUrl,
      thumbnail_url: normalizedSong.thumbnail_url,
    });
    setCurrentVideoId(videoId);
    setCurrentIndex(actualIndex >= 0 ? actualIndex : index);
    setSearchQuery("");
  };

  const handleSelectArtist = (artistName) => {
    setSearchQuery(artistName);
  };

  const handleSearchYoutube = async () => {
    const query = (searchQuery || "").trim();
    if (!query) return;

    try {
      const res = await fetch(
        `${API}/api/search-youtube?query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      const videoId = getVideoIdFromUrl(data?.youtube_url || data?.videoId || "");

      if (!videoId) return;

      setCurrentVideoId(videoId);
      setCurrentIndex(0);
      setSearchQuery("");
    } catch (err) {
      console.error("Unable to search YouTube directly:", err);
    }
  };

  return (
    <nav className="relative hidden md:flex items-center justify-between gap-3 px-4 py-4 text-white md:gap-0">
      <div className="flex items-center gap-3">
        <div className="flex flex-col leading-none">
          <span className="text-[0.62rem] font-medium uppercase tracking-[0.45em] text-white/45">Studio</span>
          <span className="mt-1 text-lg border-2 border-yellow-500/20 rounded-lg font-black tracking-[0.18em] text-white/95 md:text-xl">SANGEET</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-[620px] md:w-[30%] md:min-w-[260px]">
        <div className="flex items-center rounded-full border border-white/10 bg-[#1c1c1e] shadow-[0_0_0_2px_rgba(255,255,255,0.08)] transition focus-within:border-amber-500/60 focus-within:shadow-[0_0_0_2px_rgba(251,191,36,0.4)]">
          <div className="pl-3 pr-2 text-xl text-white md:pl-4 md:text-2xl">
            <IoIosSearch />
          </div>
          <input
            type="text"
            className="w-full rounded-full bg-transparent py-2.5 pr-2 text-base text-white placeholder:text-white/70 focus:outline-none md:py-3 md:pr-4 md:text-lg"
            placeholder="Search songs, artists"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mr-2 text-2xl text-white/80 hover:text-white md:mr-4"
            >
              ×
            </button>
          )}
          <button type="button" className="mr-2 rounded-full border border-white/20 p-1.5 text-white/80 hover:text-white md:mr-4 md:p-2">
            ☰
          </button>
        </div>

        {searchQuery && (resultRows.length > 0 || directYoutubeFallback) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-[28px] border border-white/10 bg-[#1a1a1a]/95 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="border-b border-white/5 bg-gradient-to-r from-amber-500/10 via-transparent to-emerald-500/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-300">Top Results</p>
            </div>

            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {directYoutubeFallback && (
                <button
                  type="button"
                  onClick={handleSearchYoutube}
                  className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/5 md:gap-4 md:px-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/25 to-emerald-500/20 text-lg text-white md:h-12 md:w-12 md:text-2xl">
                    🔎
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-base font-semibold text-white md:text-lg">Search YouTube for “{directYoutubeFallback.query}”</p>
                    <p className="text-xs text-gray-400 md:text-sm">Not in our library</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-300">
                    Search
                  </span>
                </button>
              )}

              {resultRows.map((item, index) => {
                if (item.type === "artist") {
                  return (
                    <button
                      key={item.id || `${item.name}-${index}`}
                      type="button"
                      onClick={() => handleSelectArtist(item.name)}
                      className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/5 md:gap-4 md:px-4"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-11 w-11 rounded-full object-cover md:h-12 md:w-12"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-base font-semibold text-white md:text-lg">{item.name}</p>
                        <p className="text-xs text-gray-400 md:text-sm">Artist</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-[#262626] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-300">
                        Artist
                      </span>
                    </button>
                  );
                }

                const normalizedSong = normalizeSong(item);
                const songTitle = normalizedSong.title || "Unknown Song";
                const artistName = normalizedSong.artist || "Unknown Artist";
                const thumbnail = normalizedSong.thumbnail_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231f1f23'/%3E%3Cstop offset='100%25' stop-color='%230f0f12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%232a2a30'/%3E%3Cpath d='M190 170v60l50-30z' fill='%23f59e0b'/%3E%3C/svg%3E";

                return (
                  <button
                    key={normalizedSong._id || `${songTitle}-${artistName}-${index}`}
                    type="button"
                    onClick={() => handleSelectSong(normalizedSong, index)}
                    className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition hover:bg-white/5 md:gap-4 md:px-4"
                  >
                    <img
                      src={thumbnail}
                      alt={songTitle}
                      className="h-11 w-11 rounded-lg object-cover md:h-12 md:w-12"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-white md:text-lg">{songTitle}</p>
                      <p className="truncate text-xs text-gray-400 md:text-sm">{artistName}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-[#262626] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-300">
                      Song
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Links & Profile */}
      <div className="hidden items-center gap-4 md:flex">
        <ul className="flex items-center gap-2">
          <li><Link to="/" className="nav-link">Discover</Link></li>
          <li><Link to="/about" className="nav-link">About</Link></li>
        </ul>

        {user && (
          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=f59e0b&color=000`}
                alt={user.name}
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="max-w-[100px] truncate text-xs font-semibold text-white/90">{user.name}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Logout"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
            >
              <IoLogOutOutline className="text-base" />
            </button>
          </div>
        )}
      </div>

      {/* Hamburger Button */}
      <button
        className="md:hidden text-3xl"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰
      </button>

      {/* Mobile Menu */}
      <ul
        className={`absolute top-16 right-0 w-48 bg-[#18181b] flex flex-col md:hidden transition-all duration-300 rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
      >
        {user && (
          <li className="border-b border-white/10 bg-white/5 px-4 py-3">
            <p className="truncate text-xs font-bold text-amber-400">{user.name}</p>
            <p className="truncate text-[10px] text-gray-400">{user.email}</p>
          </li>
        )}
        <li className="border-b border-white/5">
          <Link to="/" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5" onClick={() => setIsOpen(false)}>Discover</Link>
        </li>
        <li className="border-b border-white/5">
          <Link to="/about" className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5" onClick={() => setIsOpen(false)}>About</Link>
        </li>
        {user && (
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-400 hover:bg-red-500/10"
              onClick={() => {
                setIsOpen(false);
                logout();
                navigate("/login");
              }}
            >
              <IoLogOutOutline className="text-base" />
              Sign Out
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
