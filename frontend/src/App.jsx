import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { PlayerProvider } from "./context/PlayerContext";
import { LibraryProvider } from "./context/LibraryContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import PlaybackBridge from "./PlaybackBridge";
import { prefetchHomeFeed } from "./services/songService";

// Pre-warm fast home feed immediately on startup (~200KB instead of 15MB)
prefetchHomeFeed();
import Home from "./pages/Home";

// Lazy-loaded pages for fast initial bundle and instant first paint
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const About = lazy(() => import("./pages/About"));
const Discover = lazy(() => import("./pages/Discover"));
const Search = lazy(() => import("./pages/Search"));
const Library = lazy(() => import("./pages/Library"));
const Playlist = lazy(() => import("./pages/Playlist"));
const Artist = lazy(() => import("./pages/Artist"));
const Album = lazy(() => import("./pages/Album"));
const Support = lazy(() => import("./pages/Support"));
const Careers = lazy(() => import("./pages/Careers"));
const ForArtists = lazy(() => import("./pages/ForArtists"));
const Legal = lazy(() => import("./pages/Legal"));
const Account = lazy(() => import("./pages/Account"));

// Lightweight smooth suspense fallback
function PageFallback() {
  return (
    <div className="flex-1 w-full min-h-[60vh] flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
        <span className="text-xs font-medium tracking-wide text-zinc-400">Loading Sangeet...</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <PlayerProvider>
          <LibraryProvider>
            <PlaybackBridge />
            <Router>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  <Route path="/" element={<AppShell />}>
                    <Route index element={<Home />} />
                    <Route path="discover" element={<Discover />} />
                    <Route path="search" element={<Search />} />
                    <Route
                      path="account"
                      element={
                        <ProtectedRoute>
                          <Account />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <ProtectedRoute>
                          <Account />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="library"
                      element={
                        <ProtectedRoute>
                          <Library />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="library/:view"
                      element={
                        <ProtectedRoute>
                          <Library />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="playlist/:id" element={<Playlist />} />
                    <Route path="artist/:name" element={<Artist />} />
                    <Route path="album/:id/*" element={<Album />} />
                    <Route path="album/:id" element={<Album />} />
                    <Route path="album/*" element={<Album />} />
                    <Route path="soundtrack/:id/*" element={<Album />} />
                    <Route path="soundtrack/:id" element={<Album />} />
                    <Route path="soundtrack/*" element={<Album />} />
                    <Route path="about" element={<About />} />
                    <Route path="support" element={<Support />} />
                    <Route path="careers" element={<Careers />} />
                    <Route path="for-artists" element={<ForArtists />} />
                    <Route path="legal" element={<Legal />} />
                    <Route path="legal/:doc" element={<Legal />} />
                    <Route path="privacy" element={<Navigate to="/legal/privacy" replace />} />
                    <Route path="terms" element={<Navigate to="/legal/terms" replace />} />
                    <Route path="terms-of-service" element={<Navigate to="/legal/terms" replace />} />
                    <Route path="privacy-policy" element={<Navigate to="/legal/privacy" replace />} />
                    <Route path="cookies" element={<Navigate to="/legal/cookies" replace />} />
                    <Route path="copyright" element={<Navigate to="/legal/copyright" replace />} />
                    <Route path="accessibility" element={<Navigate to="/legal/accessibility" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </LibraryProvider>
        </PlayerProvider>
      </AuthProvider>
    </UIProvider>
  );
}

export default App;
