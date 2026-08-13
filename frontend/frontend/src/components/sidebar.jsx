import React from "react";
import { FaPlus, FaMusic, FaHeadphones } from "react-icons/fa";
import Songscontainer from "./songscontainer";

const Sidebar = () => {
  const mobileCards = [
    {
      title: 'Aashiqui 2',
      subtitle: 'Mithoon, Ankit Tiwari, Jeet Gannguli',
      image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
      tone: 'from-rose-500/70 via-amber-500/40 to-yellow-300/30',
    },
    {
      title: 'Finding Her',
      subtitle: 'Kushagra, Bharath, Saahael',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
      tone: 'from-cyan-500/70 via-emerald-500/40 to-green-300/30',
    },
    {
      title: 'Sajna',
      subtitle: 'Arijit, Sunidhi, Himesh',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
      tone: 'from-violet-500/70 via-fuchsia-500/40 to-pink-300/30',
    },
  ];

  return (
    <div className="flex flex-col gap-4 px-2 pb-4 pt-2 md:flex-row md:px-4">
      <div className="w-full md:hidden">
        <div className="mt-1 flex items-center justify-between px-2 pt-2 text-white">
          <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
            to play?
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-medium text-white/80">
              Install App
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/80">
              ⚙
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 px-1">
          <button type="button" className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-black">All</button>
          <button type="button" className="rounded-full bg-white/5 px-4 py-1.5 text-[11px] font-medium text-white/80">Music</button>
          <button type="button" className="rounded-full bg-white/5 px-4 py-1.5 text-[11px] font-medium text-white/80">Podcasts</button>
        </div>

        <div className="mt-5 rounded-[28px] border border-white/10 bg-[#1e1e20] p-4 shadow-[0_30px_50px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-2xl font-bold leading-tight text-white">1. Start playing</h2>
              <p className="mt-2 text-sm leading-5 text-gray-300">Search, browse and play your favourite artists and creators.</p>
              <button type="button" className="mt-4 rounded-full bg-[#6fef8a] px-4 py-2 text-sm font-semibold text-black">Search</button>
            </div>
            <div className="relative ml-3 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-rose-400/80 via-amber-300/60 to-emerald-300/40 shadow-lg shadow-black/20">
              <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), transparent 22%), linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0))' }} />
              <div className="relative h-16 w-16 rounded-full border-4 border-white/40 bg-white/10 backdrop-blur-sm" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white">Popular albums and singles</h3>
          <button type="button" className="text-xs font-medium text-white/60">Show all</button>
        </div>

        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {mobileCards.map((card, index) => (
            <div key={index} className="min-w-[150px] max-w-[150px]">
              <div className={`h-36 overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br ${card.tone}`}>
                <img src={card.image} alt={card.title} className="h-full w-full object-cover opacity-90" />
              </div>
              <div className="mt-2">
                <p className="truncate text-sm font-semibold text-white">{card.title}</p>
                <p className="truncate text-[11px] text-gray-400">{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white">Editor&apos;s Picks: No-Skip...</h3>
          <button type="button" className="text-xs font-medium text-white/60">Show all</button>
        </div>

        <div className="mt-3 rounded-[26px] border border-white/10 bg-[#101010] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80">⏮</div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80">⏸</div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80">⏭</div>
            <div className="ml-auto flex items-center gap-2 text-white/80">
              <button type="button" className="text-lg">≡</button>
              <button type="button" className="text-lg">◌</button>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/10">
            <div className="h-full w-1/3 rounded-full bg-white" />
          </div>
        </div>
      </div>

      <aside className="left hidden w-full flex-col rounded-[28px] border border-white/10 bg-[#121212]/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:flex md:w-[30%]">
        <div className="mb-4 flex items-center justify-between rounded-full border border-white/10 bg-[#1d1d1f] px-4 py-3 shadow-inner shadow-white/5">
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <FaMusic className="text-sm" />
            </div>
            <span className="text-xl font-semibold">Your Library</span>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10"
            aria-label="Add to library"
          >
            <FaPlus />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 text-white shadow-lg shadow-black/20">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <FaHeadphones />
            </div>
            <h3 className="text-lg font-semibold md:text-xl">Create your first playlist</h3>
            <p className="mt-2 text-sm text-gray-300">It’s easy and helps you organize every mood in one place.</p>
            <button className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02]">
              Create Playlist
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 text-white shadow-lg shadow-black/20">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <FaMusic />
            </div>
            <h3 className="text-lg font-semibold md:text-xl">Find some podcasts</h3>
            <p className="mt-2 text-sm text-gray-300">Stay inspired with fresh recommendations and curated conversations.</p>
            <button className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02]">
              Browse Podcasts
            </button>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
            <li className="transition hover:text-white">Legal</li>
            <li className="transition hover:text-white">Safety & Privacy</li>
            <li className="transition hover:text-white">Privacy Policy</li>
            <li className="transition hover:text-white">About Us</li>
            <li className="transition hover:text-white">Cookies</li>
          </ul>
        </div>
      </aside>

      <div className="hidden md:block">
        <Songscontainer />
      </div>
    </div>
  );
};

export default Sidebar;
