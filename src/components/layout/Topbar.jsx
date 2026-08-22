import { useState, useRef } from "react";
import { IoLogOutOutline, IoMenuOutline, IoSearch, IoClose } from "react-icons/io5";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import { useUI } from "../../context/UIContext";
import { avatarFor } from "../../lib/media";

const Topbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { searchQuery, setSearchQuery } = usePlayer();
  const { openAuthPrompt, toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef(null);

  const isSearchPage = location.pathname === "/search";

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!isSearchPage) {
      navigate(val.trim() ? `/search?q=${encodeURIComponent(val)}` : "/search", { replace: true });
    }
  };

  const handleSearchFocus = () => {
    if (!isSearchPage) {
      navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search");
    }
  };

  const handleSearchClick = handleSearchFocus;

  return (
    <nav className="relative flex items-center justify-between gap-3 px-4 py-3 text-white md:gap-4">
      {/* Brand Logo */}
      <Link to="/" className="flex shrink-0 items-center gap-2.5 leading-none transition hover:opacity-90">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg shadow-amber-500/25">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        </span>
        <span className="text-lg font-black tracking-[0.14em] text-white">
          SANGEET
        </span>
      </Link>

      {/* Global Quick Search Bar (Spotify / Apple Music style) */}
      <div className="mx-auto hidden max-w-md flex-1 md:block">
        <div
          onClick={handleSearchClick}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-all duration-200 cursor-pointer ${
            isSearchPage
              ? "border-amber-400/50 bg-[#161618] ring-1 ring-amber-400/20"
              : "border-white/[0.09] bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
          }`}
        >
          <IoSearch className="text-base text-white/50" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={handleSearchFocus}
            onChange={handleSearchChange}
            placeholder="Search songs, artists, genres..."
            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-white placeholder:text-white/35 focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery("");
                if (isSearchPage) navigate("/search");
              }}
              className="text-white/40 hover:text-white"
            >
              <IoClose className="text-sm" />
            </button>
          ) : (
            <span className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-white/35">
              Ctrl K
            </span>
          )}
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "text-amber-300" : "text-white/50 hover:text-white"}`
          }
        >
          About
        </NavLink>
        <button
          type="button"
          onClick={() => toast("Support is on the way — email us soon.", "info")}
          className="px-3 py-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
        >
          Support
        </button>
        <button
          type="button"
          onClick={() => toast("The Sangeet app isn't available yet — coming soon.", "info")}
          className="px-3 py-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
        >
          Download
        </button>

        {isAuthenticated ? (
          <div className="ml-3 flex items-center gap-2 border-l border-white/10 pl-4">
            <button
              type="button"
              onClick={() => navigate("/account")}
              className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 transition hover:border-amber-400/40 hover:bg-white/[0.08]"
              title="View Account & Profile"
            >
              <img
                src={avatarFor(user?.name || "User", "eab34a&color=000")}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="max-w-[100px] truncate text-xs font-bold text-white/90">{user?.name}</span>
            </button>
            <button
              type="button"
              onClick={() => { logout(); navigate("/"); }}
              aria-label="Log out"
              title="Sign Out"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/[0.08] text-rose-400 transition hover:bg-rose-500/15"
            >
              <IoLogOutOutline className="text-base" />
            </button>
          </div>
        ) : (
          <div className="ml-3 flex items-center gap-2 border-l border-white/10 pl-4">
            <button
              type="button"
              onClick={() => openAuthPrompt("default")}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-white/60 transition hover:text-white"
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-4 py-2 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-105 active:scale-95"
            >
              Log in
            </button>
          </div>
        )}
      </div>

      {/* Mobile: overflow menu */}
      <div className="flex shrink-0 items-center gap-2 md:hidden">
        {!isAuthenticated && (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-black shadow-sm"
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