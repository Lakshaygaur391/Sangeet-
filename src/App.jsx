import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { PlayerProvider } from "./context/PlayerContext";
import { LibraryProvider } from "./context/LibraryContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import PlaybackBridge from "./PlaybackBridge";

import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Playlist from "./pages/Playlist";
import Artist from "./pages/Artist";
import Album from "./pages/Album";
import Support from "./pages/Support";
import Careers from "./pages/Careers";
import ForArtists from "./pages/ForArtists";
import Legal from "./pages/Legal";
import Account from "./pages/Account";

function App() {
  return (
    // Provider order matters: UI (toasts) first since Library depends on it,
    // then Auth (Library keys its cache off the signed-in user), then
    // Player and Library side by side (bridged via PlaybackBridge below).
    <UIProvider>
      <AuthProvider>
        <PlayerProvider>
          <LibraryProvider>
            <PlaybackBridge />
            <Router>
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
                  <Route path="album/:id" element={<Album />} />
                  <Route path="about" element={<About />} />
                  <Route path="support" element={<Support />} />
                  <Route path="careers" element={<Careers />} />
                  <Route path="for-artists" element={<ForArtists />} />
                  <Route path="legal/:doc" element={<Legal />} />
                </Route>
              </Routes>
            </Router>
          </LibraryProvider>
        </PlayerProvider>
      </AuthProvider>
    </UIProvider>
  );
}

export default App;
