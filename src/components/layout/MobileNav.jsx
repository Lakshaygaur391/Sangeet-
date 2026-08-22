import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  IoHomeOutline,
  IoHome,
  IoCompassOutline,
  IoCompass,
  IoSearchOutline,
  IoSearch,
  IoLibraryOutline,
  IoLibrary,
  IoPersonOutline,
  IoPerson,
  IoLogOutOutline,
  IoHeartOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { avatarFor } from "../../lib/media";

const NAV_ITEMS = [
  { to: "/", end: true, label: "Home", Outline: IoHomeOutline, Filled: IoHome },
  { to: "/discover", label: "Discover", Outline: IoCompassOutline, Filled: IoCompass },
  { to: "/search", label: "Search", Outline: IoSearchOutline, Filled: IoSearch },
  { to: "/library", label: "Library", Outline: IoLibraryOutline, Filled: IoLibrary, requireAuth: true },
];

const MobileNav = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const navigate = useNavigate();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [accountMenuOpen]);

  const handleAccountClick = () => {
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    setAccountMenuOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await logout();
    toast("Logged out successfully", "info");
    navigate("/");
  };

  return (
    <>
      {/* Mobile Account Bottom Sheet / Popup Menu */}
      {accountMenuOpen && isAuthenticated && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setAccountMenuOpen(false)}
        >
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl border-t border-white/10 bg-[#121215] p-5 pb-8 shadow-2xl animate-slide-up space-y-4"
          >
            {/* User Profile Header */}
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
              <img
                src={avatarFor(user?.name || "User", "eab34a&color=000")}
                alt=""
                className="h-12 w-12 rounded-full border-2 border-amber-400/40 object-cover shadow-lg shadow-amber-400/20"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">{user?.name || "Music Lover"}</p>
                <p className="truncate text-xs text-white/50">{user?.email || "Free Listener"}</p>
                <span className="mt-1 inline-block rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  100% Free Plan
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  navigate("/account");
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
              >
                <IoPersonOutline className="text-lg text-amber-400" />
                <span>Account & Audio Settings</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  navigate("/library/liked");
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
              >
                <IoHeartOutline className="text-lg text-rose-400" />
                <span>Liked Songs</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  navigate("/library/recent");
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:text-white"
              >
                <IoTimeOutline className="text-lg text-amber-400" />
                <span>Listening History</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
              >
                <IoLogOutOutline className="text-lg" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5-Item Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0c0c0e]/98 backdrop-blur-2xl md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map(({ to, end, label, Outline, Filled, requireAuth }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={(e) => {
                if (requireAuth && !isAuthenticated) {
                  e.preventDefault();
                  openAuthPrompt("library");
                }
              }}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold tracking-tight transition-colors ${
                  isActive ? "text-amber-300" : "text-white/45 hover:text-white/80"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(234,179,74,0.8)]" />
                  )}
                  <span className="text-xl">{isActive ? <Filled /> : <Outline />}</span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* 5th Item: User Account / Profile */}
          <button
            type="button"
            onClick={handleAccountClick}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold tracking-tight transition-colors ${
              accountMenuOpen ? "text-amber-300" : "text-white/45 hover:text-white/80"
            }`}
          >
            {isAuthenticated ? (
              <div className="relative">
                <img
                  src={avatarFor(user?.name || "User", "eab34a&color=000")}
                  alt=""
                  className={`h-6 w-6 rounded-full border object-cover transition-transform ${
                    accountMenuOpen ? "border-amber-400 scale-110 shadow-sm shadow-amber-400/50" : "border-white/20"
                  }`}
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black" />
              </div>
            ) : (
              <span className="text-xl">
                <IoPersonOutline />
              </span>
            )}
            <span className="truncate max-w-[50px]">
              {isAuthenticated ? (user?.name?.split(" ")[0] || "Account") : "Sign In"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
