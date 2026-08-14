import { NavLink } from "react-router-dom";
import { IoHomeOutline, IoHome, IoCompassOutline, IoCompass, IoSearchOutline, IoSearch, IoLibraryOutline, IoLibrary } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

const items = [
  { to: "/", end: true, label: "Home", Outline: IoHomeOutline, Filled: IoHome },
  { to: "/discover", label: "Discover", Outline: IoCompassOutline, Filled: IoCompass },
  { to: "/search", label: "Search", Outline: IoSearchOutline, Filled: IoSearch },
  { to: "/library", label: "Library", Outline: IoLibraryOutline, Filled: IoLibrary, requireAuth: true },
];

// Dedicated mobile nav — bottom bar, not a shrunk sidebar.
const MobileNav = () => {
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0c0d]/95 backdrop-blur-xl md:hidden"
    >
      <div className="grid grid-cols-4">
        {/* eslint-disable-next-line no-unused-vars -- Outline/Filled are used as JSX tag names inside the nested NavLink render-prop below */}
        {items.map(({ to, end, label, Outline, Filled, requireAuth }) => (
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
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? "text-amber-300" : "text-white/50"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-xl">{isActive ? <Filled /> : <Outline />}</span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
