import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/sidebar";
import About from "./components/About";
import ArtistPage from "./components/ArtistPage";
import { usePlayer } from "./components/playerContext";
import Player from "./components/Player";
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function MainContent() {
  const { currentVideoId, setCurrentVideoId } = usePlayer();
  const { isAuthenticated } = useAuth();
  const hasValidVideoId = Boolean(currentVideoId && /^[A-Za-z0-9_-]{11}$/.test(currentVideoId));

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
                <div className="mx-auto max-w-[1640px] px-3 py-4 md:px-5">
                  <div className="app-shell relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0c0c0d]/90 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.08),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.08),_transparent_25%)]" />
                    <div className="relative z-10">
                      <Navbar />
                      <Routes>
                        <Route path="/" element={<Sidebar setCurrentVideoId={setCurrentVideoId} />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/artist/:artistName" element={<ArtistPage />} />
                      </Routes>
                    </div>
                  </div>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>

      {isAuthenticated && hasValidVideoId && (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-white/10 bg-[#0f0f10]/95 p-4 shadow-[0_-10px_35px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <Player videoId={currentVideoId} />
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
