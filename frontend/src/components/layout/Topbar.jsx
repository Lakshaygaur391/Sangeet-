import { useState, useRef, useEffect } from "react";
import { IoLogOutOutline, IoMenuOutline, IoSearch, IoClose } from "react-icons/io5";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { avatarFor } from "../../lib/media";

const Topbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isSearchPage = location.pathname === "/search";
  const urlQ = new URLSearchParams(location.search).get("q") || "";
  const [localInput, setLocalInput] = useState(urlQ);

  // Sync input value with URL search query param
  useEffect(() => {
    if (isSearchPage) {
      setLocalInput(urlQ);
    }
  }, [isSearchPage, urlQ]);

  // Global Ctrl/Cmd + K shortcut to focus navigation search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!isSearchPage) {
          navigate(localInput.trim() ? `/search?q=${encodeURIComponent(localInput)}` : "/search");
        }
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchPage, localInput, navigate]);

  // Auto-focus search bar when entering Search page
  useEffect(() => {
    if (isSearchPage) {
      searchInputRef.current?.focus();
    }
  }, [isSearchPage]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalInput(val);
    const target = val.trim() ? `/search?q=${encodeURIComponent(val)}` : "/search";
    navigate(target, { replace: isSearchPage });
  };

  const handleSearchFocus = () => {
    if (!isSearchPage) {
      navigate(localInput.trim() ? `/search?q=${encodeURIComponent(localInput)}` : "/search");
    }
  };

  const handleSearchClick = handleSearchFocus;

  return (
    <nav className="relative flex items-center justify-between gap-2 px-3 py-2.5 text-white sm:gap-4 sm:px-4 sm:py-3">
      {/* Brand Logo */}
      <Link to="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5 leading-none transition hover:opacity-90">
        <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg shadow-amber-500/25">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
        </span>
        <span className="hidden sm:inline text-base sm:text-lg font-black tracking-[0.12em] text-white">
          SANGEET
        </span>
      </Link>

      {/* Desktop Search Bar (mobile uses dedicated search bar in Search page) */}
      <div className="mx-auto hidden max-w-md flex-1 px-1 sm:px-2 md:flex">
        <div
          onClick={handleSearchClick}
          className={`group flex w-full items-center gap-1.5 sm:gap-2.5 rounded-full border px-2.5 sm:px-4 py-1.5 sm:py-2 transition-all duration-200 cursor-pointer shadow-sm ${
            isSearchPage
              ? "border-amber-400/60 bg-[#161619] shadow-[0_0_16px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30"
              : "border-white/[0.08] bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06] hover:shadow-md"
          }`}
        >
          <IoSearch className="text-sm sm:text-base text-white/45 transition-colors group-hover:text-amber-300 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={localInput}
            onFocus={handleSearchFocus}
            onChange={handleSearchChange}
            placeholder={isMobile ? "Search..." : "Search songs, artists, genres..."}
            className="w-full min-w-0 bg-transparent text-xs font-medium text-white placeholder:text-white/35 focus:outline-none"
          />
          {localInput ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                setLocalInput("");
                if (isSearchPage) navigate("/search", { replace: true });
                searchInputRef.current?.focus();
              }}
              className="text-white/40 hover:text-white transition p-0.5 shrink-0"
            >
              <IoClose className="text-xs sm:text-sm" />
            </button>
          ) : (
            <span className="hidden lg:inline-flex items-center shrink-0 rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold text-white/40 shadow-inner">
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
                src={user?.avatar || avatarFor(user?.name || "User")}
                alt=""
                className="h-6 w-6 rounded-full object-cover ring-1 ring-amber-400/40"
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
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:hidden">
        {!isAuthenticated && (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-black shadow-sm"
          >
            Log in
          </button>
        )}
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
        >
          <IoMenuOutline className="text-base sm:text-lg" />
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