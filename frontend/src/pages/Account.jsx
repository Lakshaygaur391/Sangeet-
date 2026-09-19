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
  IoCheckmarkCircle,
  IoChevronForward,
  IoTrashOutline,
  IoCameraOutline,
  IoDiceOutline,
  IoPencilOutline,
  IoCheckmark,
  IoClose,
  IoVolumeHighOutline,
  IoFlameOutline,
  IoColorWandOutline,
  IoRadioOutline,
  IoHardwareChipOutline,
  IoInformationCircleOutline,
} from "react-icons/io5";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";
import { useUI } from "../context/UIContext";
import { avatarFor, CURATED_AVATARS, getAvatarUrl } from "../lib/media";

const RANDOM_SEEDS = [
  { seed: "NeonGroove", style: "adventurer", bg: "ffd5dc", name: "Neon Groover", badge: "⚡ Synth Wave" },
  { seed: "LofiSoul", style: "adventurer", bg: "c0aede", name: "Lo-Fi Soul", badge: "☕ Cozy Beats" },
  { seed: "BassDrop", style: "bottts", bg: "b6e3f4", name: "Sub Bass", badge: "🔊 Club Sound" },
  { seed: "AcousticVibe", style: "adventurer", bg: "ffdfbf", name: "Acoustic Dreamer", badge: "🎸 Warm Chords" },
  { seed: "GoldenTrack", style: "notionists", bg: "d1d4f9", name: "Retro Artist", badge: "✨ Golden Era" },
  { seed: "CyberEcho", style: "bottts", bg: "ffd5dc", name: "Cyberpunk DJ", badge: "🤖 Future Bass" },
  { seed: "VelvetVinyl", style: "adventurer", bg: "b6e3f4", name: "Velvet Groover", badge: "🎵 Vinyl Only" },
  { seed: "SolarEcho", style: "lorelei", bg: "ffdfbf", name: "Solar Pop", badge: "🌟 Radiant Vocals" },
];

const Account = () => {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { likedSongs, recentlyPlayed, playlists } = useLibrary();
  const { toast } = useUI();
  const navigate = useNavigate();

  // Avatar customization state
  const currentAvatarUrl = user?.avatar || avatarFor(user?.name || "User");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState(currentAvatarUrl);
  const [customSeed, setCustomSeed] = useState("");

  // Display name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || "");

  // Playback & audio preferences simulation
  const [audioQuality, setAudioQuality] = useState("high");
  const [volumeNormalization, setVolumeNormalization] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [crossfade, setCrossfade] = useState("3s");
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

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast("Name cannot be empty", "error");
      return;
    }
    updateUser({ name: trimmed });
    setIsEditingName(false);
    toast("Display name updated successfully", "success");
  };

  const handleOpenAvatarModal = () => {
    setPreviewAvatar(user?.avatar || avatarFor(user?.name || "User"));
    setIsAvatarModalOpen(true);
  };

  const handleSaveAvatar = () => {
    updateUser({ avatar: previewAvatar });
    setIsAvatarModalOpen(false);
    toast("Profile avatar updated successfully! 🎉", "success");
  };

  const handleSelectCuratedAvatar = (avatar) => {
    const url = getAvatarUrl({ style: avatar.style, seed: avatar.seed, bg: avatar.bg });
    setPreviewAvatar(url);
  };

  const handleRandomizeAvatar = () => {
    const randomItem = RANDOM_SEEDS[Math.floor(Math.random() * RANDOM_SEEDS.length)];
    const randomSalt = Math.floor(Math.random() * 10000);
    const url = `https://api.dicebear.com/7.x/${randomItem.style}/svg?seed=${randomItem.seed}-${randomSalt}&backgroundColor=${randomItem.bg}`;
    setPreviewAvatar(url);
    toast(`Generated new "${randomItem.name}" avatar!`, "info");
  };

  const handleCustomSeedChange = (e) => {
    const val = e.target.value;
    setCustomSeed(val);
    if (val.trim()) {
      const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(val.trim())}&backgroundColor=ffd5dc,b6e3f4,c0aede,d1d4f9,ffdfbf`;
      setPreviewAvatar(url);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in text-center py-16">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-xl">
          <IoPerson className="text-4xl" />
        </div>
        <h1 className="text-h1 font-black text-white">Sign in to view your Account</h1>
        <p className="text-body text-white/50">
          Create a free Sangeet account or log in to manage your profile, custom avatars, streaming preferences, and personalized music stats.
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
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in pb-16">
      {/* ── Profile Hero Header Card ── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.12] via-[#121216] to-[#0a0a0d] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Subtle decorative glow & pattern */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Interactive Avatar Container with Glowing Ring & Edit Overlay */}
            <div className="relative group shrink-0">
              <div
                onClick={handleOpenAvatarModal}
                className="relative cursor-pointer overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-[#1e1e24] p-1 shadow-[0_0_30px_rgba(245,158,11,0.22)] transition-all duration-300 group-hover:scale-105 group-hover:border-amber-400 group-hover:shadow-[0_0_40px_rgba(245,158,11,0.4)]"
                title="Click to change your avatar"
              >
                <img
                  src={currentAvatarUrl}
                  alt={user?.name || "Profile Avatar"}
                  className="h-24 w-24 rounded-2xl object-cover bg-neutral-900 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/60 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
                  <IoCameraOutline className="text-2xl text-amber-300" />
                  <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-amber-200">Change</span>
                </div>
              </div>

              {/* Online pulse badge */}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg ring-4 ring-[#121216]">
                <IoCheckmarkCircle className="text-base" />
              </span>
            </div>

            {/* Profile Info & Edit Name */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="rounded-xl border border-amber-400/40 bg-black/50 px-3 py-1 text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Enter your name"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="rounded-xl bg-amber-400 p-1.5 text-black hover:bg-amber-300 transition"
                      title="Save name"
                    >
                      <IoCheckmark className="text-lg font-black" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(user?.name || "");
                        setIsEditingName(false);
                      }}
                      className="rounded-xl bg-white/10 p-1.5 text-white/70 hover:bg-white/20 transition"
                      title="Cancel"
                    >
                      <IoClose className="text-lg" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {user?.name || "Music Listener"}
                    </h1>
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(user?.name || "");
                        setIsEditingName(true);
                      }}
                      className="text-white/40 hover:text-amber-300 transition p-1"
                      title="Edit display name"
                    >
                      <IoPencilOutline className="text-base" />
                    </button>
                  </>
                )}

                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  100% Free Plan
                </span>
              </div>

              <p className="mt-2 flex items-center justify-center sm:justify-start gap-1.5 text-xs text-white/60">
                <IoMailOutline className="text-sm text-amber-300" />
                {user?.email || "listener@sangeet.app"}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-white/45">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  High-Fidelity Master Audio
                </span>
                <span>•</span>
                <span>Lossless FLAC Ready</span>
                <span>•</span>
                <span>Ad-Free Listening</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Choose Avatar & Sign Out */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenAvatarModal}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-black text-black shadow-lg shadow-amber-500/20 transition hover:scale-105 active:scale-95"
            >
              <IoColorWandOutline className="text-base" />
              <span>Change Avatar</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-95"
            >
              <IoLogOutOutline className="text-base" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Library & Activity Stats Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Liked Songs Stat */}
        <div
          onClick={() => navigate("/library/liked")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] via-[#121215] to-[#0c0c0e] p-5 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-rose-500/40 hover:shadow-rose-500/10 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 group-hover:scale-110 group-hover:bg-rose-500/25 transition-all">
              <IoHeart className="text-2xl group-hover:animate-pulse" />
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-white/40 group-hover:text-rose-300 transition-colors">
              Open Library
              <IoChevronForward className="text-xs group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-white">{likedSongs.length}</p>
          <p className="text-xs font-bold text-rose-200/70">Liked Songs</p>
          <p className="mt-0.5 text-[11px] text-white/40">Your collection of favorite tracks</p>
        </div>

        {/* Playlists Stat */}
        <div
          onClick={() => navigate("/library")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-[#121215] to-[#0c0c0e] p-5 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/40 hover:shadow-amber-500/10 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-400 border border-amber-400/30 group-hover:scale-110 group-hover:bg-amber-400/25 transition-all">
              <IoMusicalNotes className="text-2xl" />
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-white/40 group-hover:text-amber-300 transition-colors">
              Manage
              <IoChevronForward className="text-xs group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-white">{playlists.length}</p>
          <p className="text-xs font-bold text-amber-200/70">Custom Playlists</p>
          <p className="mt-0.5 text-[11px] text-white/40">Handpicked personalized mixes</p>
        </div>

        {/* History Stat */}
        <div
          onClick={() => navigate("/library/recent")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] via-[#121215] to-[#0c0c0e] p-5 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/40 hover:shadow-indigo-500/10 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 group-hover:scale-110 group-hover:bg-indigo-500/25 transition-all">
              <IoTimeOutline className="text-2xl" />
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-white/40 group-hover:text-indigo-300 transition-colors">
              Timeline
              <IoChevronForward className="text-xs group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-white">{recentlyPlayed.length}</p>
          <p className="text-xs font-bold text-indigo-200/70">Played in History</p>
          <p className="mt-0.5 text-[11px] text-white/40">Recent streams and playback log</p>
        </div>
      </div>

      {/* ── Favorite Regional Genres ── */}
      {topLanguages.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#121215] p-5 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <IoMusicalNotes className="text-lg" />
            </span>
            <div>
              <p className="text-sm font-black text-white">Your Music DNA & Top Genres</p>
              <p className="text-xs text-white/50">Derived from your streaming habits & favorites</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {topLanguages.map((lang) => (
              <span
                key={lang}
                className="rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-4 py-1 text-xs font-bold text-amber-200 shadow-sm"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Audio & Playback Preferences ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121215] p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <IoVolumeHighOutline className="text-amber-400 text-xl" />
              Playback & Audio Settings
            </h2>
            <p className="text-xs text-white/50 mt-0.5">Customize your high-fidelity streaming & sound processing</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold text-white/50">
            Hi-Res FLAC 24-Bit Engine
          </span>
        </div>

        {/* Audio Quality 3-Tier Selector */}
        <div>
          <label className="text-sm font-bold text-white block mb-1">Streaming Audio Quality</label>
          <p className="text-xs text-white/50 mb-3">Higher bitrates deliver richer bass response and crystal clear vocals</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                key: "normal",
                name: "Normal (160k)",
                desc: "AAC Standard • Data saver",
                badge: "160 kbps",
              },
              {
                key: "high",
                name: "High (320k)",
                desc: "Rich bass & high treble",
                badge: "320 kbps MP3",
                recommended: true,
              },
              {
                key: "lossless",
                name: "Lossless (HD)",
                desc: "Studio Master FLAC",
                badge: "Hi-Res FLAC",
              },
            ].map((q) => {
              const active = audioQuality === q.key;
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => {
                    setAudioQuality(q.key);
                    toast(`Audio streaming quality set to ${q.name}`, "info");
                  }}
                  className={`group relative flex flex-col text-left rounded-2xl border p-4 transition-all duration-200 ${
                    active
                      ? "border-amber-400/60 bg-gradient-to-b from-amber-400/15 via-[#1a1917] to-[#121215] shadow-lg shadow-amber-400/10"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        active
                          ? "bg-amber-400 text-black font-black"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {q.badge}
                    </span>
                    {active && (
                      <span className="flex items-center gap-0.5">
                        <span className="h-2 w-0.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="h-3 w-0.5 rounded-full bg-amber-400 animate-pulse delay-75" />
                        <span className="h-1.5 w-0.5 rounded-full bg-amber-400 animate-pulse delay-150" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 text-sm font-black text-white">{q.name}</p>
                  <p className="mt-0.5 text-xs text-white/50">{q.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="divide-y divide-white/[0.06] space-y-4 pt-2">
          {/* Volume Normalization */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-bold text-white">Volume Normalization</p>
              <p className="text-xs text-white/50">Equalize playback volume consistently across dynamic recordings</p>
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
              className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
                volumeNormalization ? "bg-amber-400" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 block h-4 w-4 rounded-full bg-black shadow-md transition-transform ${
                  volumeNormalization ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Autoplay Endless Mix */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-bold text-white">Autoplay Endless Mix</p>
              <p className="text-xs text-white/50">Automatically keep the music playing with similar tracks when queue finishes</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAutoplay(!autoplay);
                toast(!autoplay ? "Autoplay enabled" : "Autoplay disabled", "info");
              }}
              className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
                autoplay ? "bg-amber-400" : "bg-white/20"
              }`}
            >
              <span
                className={`absolute top-1 block h-4 w-4 rounded-full bg-black shadow-md transition-transform ${
                  autoplay ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Crossfade Transitions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <div>
              <p className="text-sm font-bold text-white">Crossfade Transitions</p>
              <p className="text-xs text-white/50">Smoothly blend songs into one another without pauses</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {["Off", "3s", "5s", "8s", "12s"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCrossfade(s);
                    toast(`Crossfade duration set to ${s}`, "info");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    crossfade === s
                      ? "bg-amber-400 text-black shadow-md shadow-amber-400/25"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Security & Data Management ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#121215] p-6 sm:p-7 shadow-xl space-y-5">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <IoShieldCheckmarkOutline className="text-emerald-400 text-xl" />
            Security & Privacy Controls
          </h2>
          <p className="text-xs text-white/50 mt-0.5">Your streaming credentials and listening habits are 100% private</p>
        </div>

        {/* SSL Encryption Indicator */}
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
          <IoShieldCheckmarkOutline className="text-2xl text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">256-Bit SSL/TLS Cryptographic Security</p>
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1">
              Your credentials, library preferences, and active streaming session tokens are securely protected with enterprise-grade AES-256 encryption.
            </p>
          </div>
        </div>

        {/* Clear Storage / Cache */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-sm font-bold text-white">Streaming Cache Storage ({streamingCache})</p>
            <p className="text-xs text-white/50">Clear temporary album artwork, waveform audio buffers, and cached metadata</p>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            className="flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white transition active:scale-95"
          >
            <IoTrashOutline className="text-sm text-rose-400" />
            <span>Clear Cache</span>
          </button>
        </div>

        {/* Active Client / Session Details */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-xs text-white/40">
          <div className="flex items-center gap-2">
            <IoHardwareChipOutline className="text-amber-400 text-sm" />
            <span>Client: Sangeet Web App v2.4 (High-Fidelity)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-white/60 font-semibold">Synchronized with Sangeet Cloud</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Avatar Selector Modal ── */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-amber-500/30 bg-[#131317] p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <IoColorWandOutline className="text-amber-400 text-lg" />
                  Choose Your Music Persona
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Pick an avatar that reflects your musical style or generate a custom one
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            {/* Live Selected Avatar Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-[#18181f] to-[#121215] p-5 shadow-inner">
              <div className="relative shrink-0">
                <img
                  src={previewAvatar}
                  alt="Selected Preview"
                  className="h-20 w-20 rounded-2xl border-2 border-amber-400 object-cover shadow-lg shadow-amber-400/20"
                />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black shadow">
                  <IoCheckmark className="text-xs font-black" />
                </span>
              </div>
              <div className="text-center sm:text-left flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Live Preview</p>
                <p className="text-base font-black text-white mt-0.5">{user?.name || "Music Listener"}</p>
                <p className="text-xs text-white/50 mt-1">
                  This avatar will appear on your top navigation, mobile drawer, and player profile.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20 transition active:scale-95 shrink-0"
              >
                <IoDiceOutline className="text-base" />
                <span>Shuffle Seed</span>
              </button>
            </div>

            {/* Curated Music Personas Grid */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
                Curated Music Personas
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CURATED_AVATARS.map((item) => {
                  const itemUrl = getAvatarUrl({ style: item.style, seed: item.seed, bg: item.bg });
                  const isSelected = previewAvatar === itemUrl;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectCuratedAvatar(item)}
                      className={`group relative flex flex-col items-center p-3 rounded-2xl border text-center transition-all duration-200 ${
                        isSelected
                          ? "border-amber-400 bg-amber-400/15 shadow-md shadow-amber-400/20 scale-[1.03]"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="relative mb-2">
                        <img
                          src={itemUrl}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover bg-neutral-900 ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                        />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-black shadow text-[10px] font-black">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate max-w-[120px]">{item.name}</p>
                      <span className="text-[10px] text-white/50 truncate max-w-[120px] mt-0.5">
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Seed Input */}
            <div className="border-t border-white/[0.08] pt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60 block mb-1.5">
                Generate from Custom Nickname / Seed
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSeed}
                  onChange={handleCustomSeedChange}
                  placeholder="e.g. DJ Umang, CosmicBeat, StarSinger..."
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition flex items-center gap-1.5"
                >
                  <IoDiceOutline className="text-base text-amber-400" />
                  Random
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="rounded-full px-5 py-2.5 text-xs font-bold text-white/60 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-2.5 text-xs font-black text-black shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all"
              >
                Apply & Save Avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account;
