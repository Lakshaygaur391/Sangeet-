import { useState } from "react";
import { Outlet } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Footer from "./Footer";
import ScrollToHash from "./ScrollToHash";
import Player from "../player/Player";
import MiniPlayer from "../player/MiniPlayer";
import Queue from "../player/Queue";
import NowPlaying from "../player/NowPlaying";
import ToastStack from "../ui/ToastStack";
import CreatePlaylistModal from "../PlaylistModal";
import AuthPromptModal from "../AuthPromptModal";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

// Public shell — rendered for everyone, logged in or not. Individual routes
// (Library, Playlist) are wrapped in <ProtectedRoute> at the router level;
// this shell itself never redirects.
const AppShell = () => {
  const { currentSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [createOpen, setCreateOpen] = useState(false);

  // Gate playlist creation behind auth without blocking the rest of the app.
  const requestCreatePlaylist = () => {
    if (!isAuthenticated) {
      openAuthPrompt("playlist");
      return;
    }
    setCreateOpen(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <ToastStack />
      <Queue />
      <NowPlaying />
      <AuthPromptModal />
      <ScrollToHash />
      <CreatePlaylistModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <div className="mx-auto max-w-[1640px] px-3 py-4 md:px-5">
        <div className="app-shell relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0c0c0d]/90 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(234,179,74,0.08),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(79,209,197,0.06),_transparent_25%)]" />
          <div className="relative z-10">
            <Topbar />
            <div className="flex gap-4 px-2 pb-4 pt-1 md:px-4">
              <Sidebar onCreatePlaylist={requestCreatePlaylist} />
              <main className={`w-full min-w-0 ${currentSong ? "pb-40 md:pb-28" : "pb-24 md:pb-6"}`}>
                <Outlet context={{ openCreatePlaylist: requestCreatePlaylist }} />
                <Footer />
              </main>
            </div>
            <Player />
          </div>
        </div>
      </div>

      <MiniPlayer />
      <MobileNav />
    </div>
  );
};

export default AppShell;
