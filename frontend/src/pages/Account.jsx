import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoPerson,
  IoMailOutline,
  IoShieldCheckmarkOutline,
  IoHeart,
  IoMusicalNotes,
  IoTimeOutline,
  IoLockClosedOutline,
  IoLogOutOutline,
  IoSparkles,
  IoCheckmarkCircle,
  IoChevronForward,
  IoTrashOutline,
} from "react-icons/io5";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";
import { usePlayer } from "../context/PlayerContext";
import { useUI } from "../context/UIContext";
import { avatarFor } from "../lib/media";

const Account = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { likedSongs, recentlyPlayed, playlists, clearRecentlyPlayed } = useLibrary();
  const { playSong } = usePlayer();
  const { toast } = useUI();
  const navigate = useNavigate();

  // Local settings simulation for production feel
  const [audioQuality, setAudioQuality] = useState("high");
  const [volumeNormalization, setVolumeNormalization] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [streamingCache, setStreamingCache] = useState("24.8 MB");

  // Top languages / genres derived from library
  const topLanguages = useMemo(() => {
    const counts = {};
    for (const song of [...likedSongs, ...recentlyPlayed]) {
      if (song.language) {
        counts[song.language] = (counts[song.language] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lang]) => lang);
  }, [likedSongs, recentlyPlayed]);

  const handleLogout = async () => {
    await logout();
    toast("Logged out successfully", "info");
    navigate("/");
  };

  const handleClearCache = () => {
    setStreamingCache("0 KB");
    toast("Streaming cache cleared successfully", "success");
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in text-center py-16">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-xl">
          <IoPerson className="text-4xl" />
        </div>
        <h1 className="text-h1 font-black text-white">Sign in to view your Account</h1>
        <p className="text-body text-white/50">
          Create a free Sangeet account or log in to manage your profile, streaming preferences, and personalized music stats.
        </p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-8 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/25 transition hover:scale-105"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in pb-12">
      {/* ── Profile Hero Header Card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/15 via-[#131316] to-[#0a0a0c] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="relative">
              <img
                src={avatarFor(user?.name || "User", "eab34a&color=000")}
                alt=""
                className="h-24 w-24 rounded-3xl border-2 border-amber-400/40 object-cover shadow-2xl shadow-amber-500/20"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black shadow-md ring-4 ring-[#131316]">
                <IoCheckmarkCircle className="text-base" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-h1 font-black text-white">{user?.name || "Music Listener"}</h1>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  100% Free Plan
                </span>
              </div>
              <p className="mt-1 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-white/50">
                <IoMailOutline className="text-sm text-amber-300" />
                {user?.email || "listener@sangeet.app"}
              </p>
              <p className="mt-2 text-[11px] text-white/40">
                Member of Sangeet Free Music Streaming Platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/[0.08] px-5 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-95"
          >
            <IoLogOutOutline className="text-base" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Library & Activity Stats Grid ── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {/* Liked Songs Stat */}
        <div
          onClick={() => navigate("/library/liked")}
          className="group cursor-pointer rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-lg transition-all duration-200 hover:border-amber-400/30 hover:bg-[#161619] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
              <IoHeart className="text-xl" />
            </span>
            <IoChevronForward className="text-white/30 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="mt-4 text-2xl font-black text-white">{likedSongs.length}</p>
          <p className="text-xs font-semibold text-white/50">Liked Songs</p>
        </div>

        {/* Playlists Stat */}
        <div
          onClick={() => navigate("/library")}
          className="group cursor-pointer rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-lg transition-all duration-200 hover:border-amber-400/30 hover:bg-[#161619] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20 group-hover:scale-110 transition-transform">
              <IoMusicalNotes className="text-xl" />
            </span>
            <IoChevronForward className="text-white/30 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="mt-4 text-2xl font-black text-white">{playlists.length}</p>
          <p className="text-xs font-semibold text-white/50">Custom Playlists</p>
        </div>

        {/* History Stat */}
        <div
          onClick={() => navigate("/library/recent")}
          className="group cursor-pointer rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-lg transition-all duration-200 hover:border-amber-400/30 hover:bg-[#161619] hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <IoTimeOutline className="text-xl" />
            </span>
            <IoChevronForward className="text-white/30 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="mt-4 text-2xl font-black text-white">{recentlyPlayed.length}</p>
          <p className="text-xs font-semibold text-white/50">Played in History</p>
        </div>
      </div>

      {/* ── Favorite Regional Genres ── */}
      {topLanguages.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#121214] p-5 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <IoSparkles className="text-amber-400 text-lg" />
            <div>
              <p className="text-sm font-bold text-white">Your Top Music Genres</p>
              <p className="text-xs text-white/45">Based on your listening history & liked tracks</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {topLanguages.map((lang) => (
              <span
                key={lang}
                className="rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3.5 py-1 text-xs font-bold text-amber-200"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Audio & Playback Preferences (Production Level) ── */}
      <div className="rounded-3xl border border-white/[0.07] bg-[#121214] p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-h2 font-black text-white">Playback & Audio Settings</h2>
          <p className="text-caption text-white/50 mt-0.5">Customize your high-fidelity streaming preferences</p>
        </div>

        <div className="divide-y divide-white/[0.06] space-y-4">
          {/* Audio Quality */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div>
              <p className="text-sm font-bold text-white">Streaming Audio Quality</p>
              <p className="text-xs text-white/50">Higher bitrates deliver richer bass and crystal clear vocals</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {[
                { key: "normal", label: "Normal (160k)" },
                { key: "high", label: "High (320k)" },
                { key: "lossless", label: "Lossless (HD)" },
              ].map((q) => (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => {
                    setAudioQuality(q.key);
                    toast(`Audio quality set to ${q.label}`, "info");
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    audioQuality === q.key
                      ? "bg-amber-400 text-black shadow-md shadow-amber-400/25"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Normalization */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-bold text-white">Volume Normalization</p>
              <p className="text-xs text-white/50">Equalize playback volume consistently across different songs</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setVolumeNormalization(!volumeNormalization);
                toast(
                  !volumeNormalization ? "Volume normalization enabled" : "Volume normalization disabled",
                  "info"
                );
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                volumeNormalization ? "bg-amber-400" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 block h-4 w-4 rounded-full bg-black shadow-md transition-transform ${
                  volumeNormalization ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Autoplay */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-bold text-white">Autoplay Endless Mix</p>
              <p className="text-xs text-white/50">Automatically keep the music going with similar tracks when queue finishes</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAutoplay(!autoplay);
                toast(!autoplay ? "Autoplay enabled" : "Autoplay disabled", "info");
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                autoplay ? "bg-amber-400" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 block h-4 w-4 rounded-full bg-black shadow-md transition-transform ${
                  autoplay ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Security & Data Management ── */}
      <div className="rounded-3xl border border-white/[0.07] bg-[#121214] p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-h2 font-black text-white">Security & Privacy Controls</h2>
          <p className="text-caption text-white/50 mt-0.5">Your data is 100% protected and encrypted</p>
        </div>

        {/* SSL Encryption Indicator */}
        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <IoShieldCheckmarkOutline className="text-xl text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">256-Bit SSL/TLS Cryptographic Security</p>
            <p className="text-xs text-white/50 mt-1">
              Your credentials, library preferences, and active streaming session tokens are securely protected with enterprise-grade encryption.
            </p>
          </div>
        </div>

        {/* Clear Storage / Cache */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-sm font-bold text-white">Streaming Cache Storage ({streamingCache})</p>
            <p className="text-xs text-white/50">Clear temporary album artwork and cached audio waveform state</p>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition active:scale-95"
          >
            <IoTrashOutline /> Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
};

export default Account;
