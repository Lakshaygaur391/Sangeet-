import {
  IoShieldCheckmarkOutline,
  IoLockClosedOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";

const About = () => {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in pb-8">
      {/* Header Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/15 via-[#141416] to-[#0e0e10] p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-meta font-extrabold uppercase tracking-widest text-amber-400">About Sangeet</p>
        </div>
        <h1 className="text-display mt-2 font-black text-white">Music, Simplified & Free</h1>
        <p className="text-body mt-3 max-w-2xl leading-relaxed text-white/70">
          <strong className="text-white">Sangeet</strong> is a next-generation music streaming and discovery
          platform built to make music listening smooth, fast, and accessible to everyone without paywalls.
        </p>
      </div>

      {/* 100% Free & Sign-up Model */}
      <div className="rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-xl sm:p-8 space-y-4">
        <div>
          <h2 className="text-h2 font-black text-white">100% Free Streaming Platform</h2>
          <p className="text-caption text-white/50 mt-0.5">Zero subscriptions · No hidden credit card charges</p>
        </div>

        <p className="text-body leading-relaxed text-white/70">
          Sangeet is <strong className="text-amber-300">100% free forever</strong>. Anyone can freely browse the catalog,
          explore trending hits, search through verified artists, and discover regional playlists across multiple languages.
        </p>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4 sm:p-5">
          <h3 className="text-sm font-bold text-amber-300">
            Why a Free Account is Required to Play Music
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-white/75">
            To stream high-quality audio tracks, maintain your continuous playback queue, save favorite songs, and create custom playlists, a quick free account signup is required. This ensures optimized low-latency CDN streaming bandwidth, protects against automated bot abuse, and guarantees your personal listening history persists securely across sessions.
          </p>
        </div>
      </div>

      {/* 100% Secure & Data Protection Guarantee */}
      <div className="rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-xl sm:p-8 space-y-4">
        <div>
          <h2 className="text-h2 font-black text-white">100% Secure & Privacy-First Architecture</h2>
          <p className="text-caption text-white/50 mt-0.5">Enterprise-grade encryption and user data protection</p>
        </div>

        <p className="text-body leading-relaxed text-white/70">
          We treat user privacy and data security with the highest industry standards. Your personal information, listening preferences, and account credentials are strictly protected:
        </p>

        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <IoLockClosedOutline className="text-lg text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">256-Bit SSL/TLS Encryption</p>
              <p className="text-xs text-white/50 mt-1">All data transmitted between your browser and our servers is strictly encrypted.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <IoShieldCheckmarkOutline className="text-lg text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">Hashed Authentication</p>
              <p className="text-xs text-white/50 mt-1">Passwords are cryptographically salted and hashed using industry-standard bcrypt.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <IoCheckmarkCircleOutline className="text-lg text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">Zero Data Selling</p>
              <p className="text-xs text-white/50 mt-1">We never sell, rent, or monetize your personal information or listening habits with advertisers.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <IoCheckmarkCircleOutline className="text-lg text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">Isolated User Storage</p>
              <p className="text-xs text-white/50 mt-1">Your playlists, likes, and history are privately partitioned to your unique authenticated scope.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack & Design */}
      <div className="rounded-3xl border border-white/10 bg-[#121214] p-6 shadow-xl sm:p-8 space-y-3">
        <h2 className="text-h2 font-black text-white">Built for High Performance</h2>
        <p className="text-body leading-relaxed text-white/70">
          Sangeet is engineered with modern web technologies including <strong className="text-white">React</strong>, <strong className="text-white">Node.js</strong>, <strong className="text-white">Vite</strong>, and <strong className="text-white">Tailwind CSS</strong>, with custom audio engine state synchronization for instantaneous seek restoration, zero-lag search caching, and fluid responsiveness across all desktop, tablet, and mobile screens.
        </p>
        <div className="text-caption border-t border-white/10 pt-4 text-white/40 italic">
          — Sangeet · Discover music. Find your sound. 100% Free & Secure.
        </div>
      </div>
    </div>
  );
};

export default About;