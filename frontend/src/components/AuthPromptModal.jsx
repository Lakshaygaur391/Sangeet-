import { useNavigate } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import { useEffect } from "react";
import { useUI } from "../context/UIContext";
import { usePlayer } from "../context/PlayerContext";
import { normalizeSong } from "../lib/media";

const COPY = {
  default: {
    heading: "Start listening with a free Sangeet account",
    body: "Create playlists, like songs, and pick up where you left off — free, forever.",
  },
  like: {
    heading: "Sign in to save your favourite music",
    body: "Create a free Sangeet account to like songs and build your collection.",
  },
  playlist: {
    heading: "Create an account to build your playlists",
    body: "Sign up free to make playlists, add songs, and organize your library.",
  },
  follow: {
    heading: "Sign in to follow artists",
    body: "Follow your favourite artists to keep up with what they release next.",
  },
  save: {
    heading: "Sign in to save this to your library",
    body: "Create a free Sangeet account to save albums and songs for later.",
  },
  library: {
    heading: "Sign in to see your library",
    body: "Your liked songs, playlists, and recently played all live here once you're signed in.",
  },
};

// DOWNLOAD_APP_URL is intentionally left unset — there's no real app-store
// listing yet. The Download App action shows "Coming soon" until one exists,
// per the no-fake-links rule.
const DOWNLOAD_APP_URL = null;

const AuthPromptModal = () => {
  const { authPrompt, closeAuthPrompt, toast } = useUI();
  const { songList } = usePlayer();
  const navigate = useNavigate();
  const { open, action } = authPrompt;
  const copy = COPY[action] || COPY.default;

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => e.key === "Escape" && closeAuthPrompt();
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, closeAuthPrompt]);

  if (!open) return null;

  const artwork = songList.length > 0 ? normalizeSong(songList[Math.floor(songList.length / 3)]).thumbnail_url : null;

  const goTo = (path) => {
    closeAuthPrompt();
    navigate(path);
  };

  const handleDownload = () => {
    if (DOWNLOAD_APP_URL) {
      window.open(DOWNLOAD_APP_URL, "_blank", "noopener,noreferrer");
    } else {
      toast("The Sangeet app isn't available yet — coming soon.", "info");
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[92] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={closeAuthPrompt}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign up or log in"
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up w-full max-w-sm overflow-hidden rounded-t-[28px] border border-white/10 bg-[#141414] shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:rounded-[28px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="relative">
          {artwork ? (
            <img src={artwork} alt="" className="h-40 w-full object-cover" />
          ) : (
            <div className="h-40 w-full bg-gradient-to-br from-amber-500/25 to-[#1a1a1a]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/20" />
          <button
            type="button"
            aria-label="Close"
            onClick={closeAuthPrompt}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60 hover:text-white"
          >
            <IoClose />
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 text-center">
          <p className="text-meta mb-3 text-amber-300">SANGEET</p>
          <h2 className="text-h2 text-white">{copy.heading}</h2>
          <p className="text-body mt-2 text-white/50">{copy.body}</p>

          <button
            type="button"
            onClick={() => goTo("/register")}
            className="mt-6 w-full rounded-full bg-amber-400 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
          >
            Sign up free
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="mt-2.5 w-full rounded-full border border-white/15 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/5"
          >
            Download App
          </button>

          <button
            type="button"
            onClick={() => goTo("/login")}
            className="mt-4 text-sm text-white/50 transition hover:text-white"
          >
            Already have an account? <span className="font-semibold text-amber-300">Log in</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPromptModal;
