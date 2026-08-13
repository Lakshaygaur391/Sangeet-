import React from "react";
import { FaPlus, FaMusic, FaHeadphones } from "react-icons/fa";
import Songscontainer from "./songscontainer";

const Sidebar = () => {
  return (
    <div className="flex flex-col gap-4 px-2 pb-4 pt-2 md:flex-row md:px-4">
      <aside className="left w-full flex-col rounded-[28px] border border-white/10 bg-[#121212]/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:flex md:w-[30%]">
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

      <Songscontainer />
    </div>
  );
};

export default Sidebar;
