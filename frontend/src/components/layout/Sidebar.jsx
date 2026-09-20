import { NavLink } from "react-router-dom";
import {
  IoHomeOutline,
  IoHome,
  IoCompassOutline,
  IoCompass,
  IoSearchOutline,
  IoSearch,
  IoLibraryOutline,
  IoLibrary,
  IoAddCircle,
  IoHeart,
  IoTimeOutline,
  IoPeopleOutline,
  IoChevronBack,
  IoChevronForward,
} from "react-icons/io5";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

const NavItem = ({
  to,
  end,
  IconOutline,
  IconFilled,
  label,
  badge,
  badgeColor = "amber",
  requireAuth,
  isAuthenticated,
  onAuthRequired,
  collapsed = false,
}) => (
  <NavLink
    to={to}
    end={end}
    title={label}
    onClick={(e) => {
      if (requireAuth && !isAuthenticated) {
        e.preventDefault();
        onAuthRequired();
      }
    }}
    className={({ isActive }) =>
      `group relative flex items-center ${
        collapsed ? "justify-center px-2" : "justify-between px-3.5"
      } rounded-2xl py-2.5 text-sm font-semibold transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-amber-400/[0.14] via-amber-400/[0.08] to-transparent text-amber-300 shadow-[inset_0_0_0_1px_rgba(234,179,74,0.25)]"
          : "text-white/60 hover:bg-white/[0.05] hover:text-white"
      }`
    }
  >
    {({ isActive }) => {
      const Icon = isActive ? IconFilled : IconOutline;
      return (
        <>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} min-w-0`}>
            <span
              className={`text-lg transition-transform duration-200 group-hover:scale-110 ${
                isActive ? "text-amber-400" : "text-white/50 group-hover:text-white"
              }`}
            >
              <Icon />
            </span>
            {!collapsed && <span className="truncate">{label}</span>}
          </div>

          {!collapsed && badge !== undefined && badge !== null && (
            <span
              className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors ${
                badgeColor === "rose"
                  ? "border border-rose-500/20 bg-rose-500/10 text-rose-300"
                  : isActive
                  ? "border border-amber-400/30 bg-amber-400/20 text-amber-300"
                  : "border border-white/10 bg-white/[0.06] text-white/45 group-hover:text-white/80"
              }`}
            >
              {badge}
            </span>
          )}
        </>
      );
    }}
  </NavLink>
);

const Sidebar = ({ onCreatePlaylist }) => {
  const { likedSongs, recentlyPlayed, playlists } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt, sidebarOpen, toggleSidebar } = useUI();

  const onAuthRequired = () => openAuthPrompt("library");

  return (
    <aside
      className={`sticky top-20 hidden h-[calc(100vh-6.5rem)] shrink-0 flex-col justify-between rounded-[28px] border border-white/[0.08] bg-[#0c0c0e]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300 md:flex ${
        sidebarOpen ? "w-64" : "w-[72px]"
      }`}
    >
      {/* Open / Close Header Controls */}
      <div
        className={`flex items-center pb-2.5 border-b border-white/[0.06] mb-2 ${
          sidebarOpen ? "justify-between px-2" : "justify-center"
        }`}
      >
        {sidebarOpen && (
          <span className="text-[11px] font-black uppercase tracking-widest text-white/40">
            Menu
          </span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-amber-400/40 hover:bg-white/[0.08] hover:text-amber-300 active:scale-95"
        >
          {sidebarOpen ? <IoChevronBack className="text-sm" /> : <IoChevronForward className="text-sm" />}
        </button>
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-0.5 scrollbar-none">
        {/* ── Main Navigation ── */}
        <div className="space-y-1">
          <NavItem to="/" end IconOutline={IoHomeOutline} IconFilled={IoHome} label="Home" collapsed={!sidebarOpen} />
          <NavItem to="/discover" IconOutline={IoCompassOutline} IconFilled={IoCompass} label="Discover" collapsed={!sidebarOpen} />
          <NavItem to="/search" IconOutline={IoSearchOutline} IconFilled={IoSearch} label="Search" collapsed={!sidebarOpen} />
          <NavItem
            to="/library"
            end
            IconOutline={IoLibraryOutline}
            IconFilled={IoLibrary}
            label="Your Library"
            requireAuth
            isAuthenticated={isAuthenticated}
            onAuthRequired={onAuthRequired}
            collapsed={!sidebarOpen}
          />
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* ── Your Music / History ── */}
        <div>
          {sidebarOpen && (
            <div className="flex items-center justify-between px-3 py-1">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40">Your Music</p>
            </div>
          )}
          <div className="mt-1 space-y-0.5">
            <NavItem
              to="/library/liked"
              IconOutline={IoHeart}
              IconFilled={IoHeart}
              label="Liked Songs"
              badge={isAuthenticated && likedSongs.length > 0 ? likedSongs.length : null}
              badgeColor="rose"
              requireAuth
              isAuthenticated={isAuthenticated}
              onAuthRequired={onAuthRequired}
              collapsed={!sidebarOpen}
            />
            <NavItem
              to="/library/recent"
              IconOutline={IoTimeOutline}
              IconFilled={IoTimeOutline}
              label="Recently Played"
              badge={isAuthenticated && recentlyPlayed.length > 0 ? recentlyPlayed.length : null}
              requireAuth
              isAuthenticated={isAuthenticated}
              onAuthRequired={onAuthRequired}
              collapsed={!sidebarOpen}
            />
            <NavItem
              to="/library/artists"
              IconOutline={IoPeopleOutline}
              IconFilled={IoPeopleOutline}
              label="Artists"
              requireAuth
              isAuthenticated={isAuthenticated}
              onAuthRequired={onAuthRequired}
              collapsed={!sidebarOpen}
            />
          </div>
        </div>

        {sidebarOpen && (
          <>
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* ── Playlists Section ── */}
            <div>
              <div className="flex items-center justify-between px-3 py-1">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40">Playlists</p>
                <button
                  type="button"
                  onClick={onCreatePlaylist}
                  title="Create new playlist"
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-amber-300"
                >
                  <IoAddCircle className="text-base" />
                </button>
              </div>

              <button
                type="button"
                onClick={onCreatePlaylist}
                className="group relative mt-1 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-2.5 text-left text-xs font-bold text-white/80 transition-all duration-300 hover:border-amber-400/40 hover:from-amber-500/10 hover:to-transparent hover:text-white hover:shadow-[0_8px_20px_rgba(234,179,74,0.12)]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 text-amber-300 shadow-inner transition-all duration-300 group-hover:from-amber-400 group-hover:to-amber-500 group-hover:text-black group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                  <IoAddCircle className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white group-hover:text-amber-200 transition-colors">
                    Create Playlist
                  </p>
                  <p className="text-[10px] text-white/40 font-normal">Build your custom mix</p>
                </div>
              </button>

              {/* User Playlist list */}
              <div className="mt-2 space-y-0.5">
                {!isAuthenticated ? (
                  <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.06] to-transparent p-3.5 text-center shadow-inner">
                    <p className="text-xs font-medium text-white/70">Save tracks & playlists</p>
                    <button
                      type="button"
                      onClick={() => openAuthPrompt("playlist")}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-1 text-[11px] font-bold text-black shadow-md shadow-amber-500/20 transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
                    >
                      <span>Sign In Free</span>
                    </button>
                  </div>
                ) : playlists.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-white/35">No custom playlists yet.</p>
                ) : (
                  playlists.map((p) => (
                    <NavLink
                      key={p.id || p._id}
                      to={`/playlist/${p.id || p._id}`}
                      className={({ isActive }) =>
                        `group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          isActive
                            ? "bg-amber-400/[0.12] text-amber-300 font-bold"
                            : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-[10px] text-white/40 group-hover:text-amber-300">
                          ♪
                        </span>
                        <span className="truncate">{p.name}</span>
                      </div>
                      {p.songs?.length > 0 && (
                        <span className="text-[10px] text-white/30 group-hover:text-white/60">
                          {p.songs.length}
                        </span>
                      )}
                    </NavLink>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
