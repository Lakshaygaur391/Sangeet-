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
  IoAddCircle,
  IoHeart,
  IoTimeOutline,
  IoPeopleOutline,
  IoSparkles,
  IoMusicalNotes,
  IoPlay,
  IoPause,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { usePlayer } from "../../context/PlayerContext";
import { songId } from "../../lib/media";

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
}) => (
  <NavLink
    to={to}
    end={end}
    onClick={(e) => {
      if (requireAuth && !isAuthenticated) {
        e.preventDefault();
        onAuthRequired();
      }
    }}
    className={({ isActive }) =>
      `group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-amber-400/[0.14] via-amber-400/[0.08] to-transparent text-amber-300 shadow-[inset_0_0_0_1px_rgba(234,179,74,0.25)]"
          : "text-white/60 hover:bg-white/[0.05] hover:text-white"
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`text-lg transition-transform duration-200 group-hover:scale-110 ${
              isActive ? "text-amber-400" : "text-white/50 group-hover:text-white"
            }`}
          >
            {isActive ? <IconFilled /> : <IconOutline />}
          </span>
          <span className="truncate">{label}</span>
        </div>

        {badge !== undefined && badge !== null && (
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

        {/* Active Pill Indicator */}
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-amber-400 shadow-[0_0_8px_rgba(234,179,74,0.8)]" />
        )}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ onCreatePlaylist }) => {
  const { likedSongs, recentlyPlayed, playlists, yearlyPlaylists } = useLibrary();
  const { isAuthenticated, user } = useAuth();
  const { openAuthPrompt } = useUI();
  const { currentSong, isPlaying, setIsPlaying } = usePlayer();
  const navigate = useNavigate();

  const onAuthRequired = () => openAuthPrompt("library");

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-6.5rem)] w-64 shrink-0 flex-col justify-between rounded-[28px] border border-white/[0.08] bg-[#0c0c0e]/95 p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:flex">
      {/* Scrollable Navigation Body */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 scrollbar-none">
        {/* ── Main Navigation ── */}
        <div className="space-y-1">
          <NavItem to="/" end IconOutline={IoHomeOutline} IconFilled={IoHome} label="Home" />
          <NavItem to="/discover" IconOutline={IoCompassOutline} IconFilled={IoCompass} label="Discover" />
          <NavItem to="/search" IconOutline={IoSearchOutline} IconFilled={IoSearch} label="Search" />
          <NavItem
            to="/library"
            end
            IconOutline={IoLibraryOutline}
            IconFilled={IoLibrary}
            label="Your Library"
            requireAuth
            isAuthenticated={isAuthenticated}
            onAuthRequired={onAuthRequired}
          />
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* ── Your Music / History ── */}
        <div>
          <div className="flex items-center justify-between px-3 py-1">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/40">Your Music</p>
          </div>
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
            />
            <NavItem
              to="/library/artists"
              IconOutline={IoPeopleOutline}
              IconFilled={IoPeopleOutline}
              label="Artists"
              requireAuth
              isAuthenticated={isAuthenticated}
              onAuthRequired={onAuthRequired}
            />
          </div>
        </div>

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
            className="group mt-1 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-3.5 py-2.5 text-left text-xs font-bold text-white/70 transition-all hover:border-amber-400/40 hover:bg-white/[0.05] hover:text-white"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 transition group-hover:bg-amber-400 group-hover:text-black">
              <IoMusicalNotes className="text-sm" />
            </div>
            <span>Create Playlist</span>
          </button>

          {/* User Playlist list */}
          <div className="mt-2 space-y-0.5">
            {!isAuthenticated ? (
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-3 text-center">
                <p className="text-xs text-white/40">Sign in to save custom playlists.</p>
                <button
                  type="button"
                  onClick={() => openAuthPrompt("playlist")}
                  className="mt-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 transition"
                >
                  Sign In Free
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
      </div>
    </aside>
  );
};

export default Sidebar;
