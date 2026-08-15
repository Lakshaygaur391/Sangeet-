import { useState } from "react";
import { IoLogOutOutline, IoMenuOutline } from "react-icons/io5";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { avatarFor } from "../../lib/media";

const Topbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="relative flex items-center justify-between gap-3 px-4 py-4 text-white md:gap-4">
      <Link to="/" className="flex shrink-0 flex-col leading-none">

        <span className="mt-1 rounded-lg border-2 border-amber-500/20 text-lg font-black tracking-[0.18em] text-white/95 md:text-xl">
          SANGEET
        </span>
      </Link>

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