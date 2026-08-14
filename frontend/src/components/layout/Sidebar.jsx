import { NavLink } from "react-router-dom";
import {
  IoHomeOutline, IoHome, IoCompassOutline, IoCompass, IoSearchOutline, IoSearch,
  IoLibraryOutline, IoLibrary, IoAddCircle, IoHeart, IoTimeOutline, IoAlbumsOutline,
  IoPeopleOutline,
} from "react-icons/io5";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

// eslint-disable-next-line no-unused-vars -- IconOutline/IconFilled are used as JSX tag names inside the nested NavLink render-prop below
const NavItem = ({ to, end, IconOutline, IconFilled, label, requireAuth, isAuthenticated, onAuthRequired }) => (
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
      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        isActive ? "bg-amber-400/10 text-amber-200" : "text-white/65 hover:bg-white/5 hover:text-white"
      }`
    }
  >
    {({ isActive }) => (
      <>
        <span className="text-lg">{isActive ? <IconFilled /> : <IconOutline />}</span>
        {label}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ onCreatePlaylist }) => {
  const { playlists } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const onAuthRequired = () => openAuthPrompt("library");

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-1 rounded-[28px] border border-white/10 bg-[#101010]/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:flex">
      <nav className="space-y-1" aria-label="Primary">
        <NavItem to="/" end IconOutline={IoHomeOutline} IconFilled={IoHome} label="Home" />
        <NavItem to="/discover" IconOutline={IoCompassOutline} IconFilled={IoCompass} label="Discover" />
        <NavItem to="/search" IconOutline={IoSearchOutline} IconFilled={IoSearch} label="Search" />
        <NavItem
          to="/library"
          IconOutline={IoLibraryOutline}
          IconFilled={IoLibrary}
          label="Your Library"
          requireAuth
          isAuthenticated={isAuthenticated}
          onAuthRequired={onAuthRequired}
        />
      </nav>

      <div className="my-4 h-px bg-white/8" />

      <p className="text-meta mb-1 px-3">Your Music</p>
      <nav className="space-y-1" aria-label="Your music">
        <NavItem to="/library/liked" IconOutline={IoHeart} IconFilled={IoHeart} label="Liked Songs" requireAuth isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />
        <NavItem to="/library/recent" IconOutline={IoTimeOutline} IconFilled={IoTimeOutline} label="Recently Played" requireAuth isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />
        <NavItem to="/library/albums" IconOutline={IoAlbumsOutline} IconFilled={IoAlbumsOutline} label="Albums" requireAuth isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />
        <NavItem to="/library/artists" IconOutline={IoPeopleOutline} IconFilled={IoPeopleOutline} label="Artists" requireAuth isAuthenticated={isAuthenticated} onAuthRequired={onAuthRequired} />
      </nav>

      <div className="my-4 h-px bg-white/8" />

      <div className="flex items-center justify-between px-3">
        <p className="text-meta">Playlists</p>
      </div>

      <button
        type="button"
        onClick={onCreatePlaylist}
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/80 transition hover:bg-white/5 hover:text-white"
      >
        <IoAddCircle className="text-lg text-amber-300" />
        Create Playlist
      </button>

      <div className="mt-1 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {!isAuthenticated ? (
          <p className="px-3 py-2 text-xs text-white/35">Sign in to see your playlists.</p>
        ) : playlists.length === 0 ? (
          <p className="px-3 py-2 text-xs text-white/35">Your playlists will show up here.</p>
        ) : (
          playlists.map((p) => (
            <NavLink
              key={p.id || p._id}
              to={`/playlist/${p.id || p._id}`}
              className={({ isActive }) =>
                `block truncate rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? "bg-amber-400/10 text-amber-200" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {p.name}
            </NavLink>
          ))
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
