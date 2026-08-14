import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useUI } from "./UIContext";
import libraryService from "../services/libraryService";
import playlistService from "../services/playlistService";
import { normalizeSong, songId } from "../lib/media";

const LibraryContext = createContext();

const RECENT_LIMIT = 30;

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — ignore, UI still works this session */
  }
}

export const LibraryProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { toast, openAuthPrompt } = useUI();

  const scopeKey = user?.id || user?._id || "guest";
  const likedKey = `sangeet_liked_${scopeKey}`;
  const recentKey = `sangeet_recent_${scopeKey}`;
  const playlistsKey = `sangeet_playlists_${scopeKey}`;

  const [likedSongs, setLikedSongs] = useState(() => loadLocal(likedKey, []));
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => loadLocal(recentKey, []));
  const [playlists, setPlaylists] = useState(() => loadLocal(playlistsKey, []));
  const [loading, setLoading] = useState(true);

  // Reload local cache immediately when the signed-in user changes.
  useEffect(() => {
    setLikedSongs(loadLocal(likedKey, []));
    setRecentlyPlayed(loadLocal(recentKey, []));
    setPlaylists(loadLocal(playlistsKey, []));
  }, [scopeKey, likedKey, recentKey, playlistsKey]);

  // Try to hydrate from the backend; silently keep local data if those
  // endpoints aren't implemented yet (services fail soft and return null).
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [liked, recent, remotePlaylists] = await Promise.all([
        libraryService.getLiked(),
        libraryService.getRecentlyPlayed(),
        playlistService.getAll(),
      ]);
      if (cancelled) return;
      if (Array.isArray(liked)) setLikedSongs(liked.map(normalizeSong));
      if (Array.isArray(recent)) setRecentlyPlayed(recent.map(normalizeSong));
      if (Array.isArray(remotePlaylists)) setPlaylists(remotePlaylists);
      setLoading(false);
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, scopeKey]);

  useEffect(() => saveLocal(likedKey, likedSongs), [likedSongs, likedKey]);
  useEffect(() => saveLocal(recentKey, recentlyPlayed), [recentlyPlayed, recentKey]);
  useEffect(() => saveLocal(playlistsKey, playlists), [playlists, playlistsKey]);

  const isLiked = useCallback(
    (song) => likedSongs.some((s) => songId(s) === songId(song)),
    [likedSongs]
  );

  const toggleLike = useCallback(
    (rawSong) => {
      if (!isAuthenticated) {
        openAuthPrompt("like");
        return;
      }
      const song = normalizeSong(rawSong);
      const id = songId(song);
      const already = likedSongs.some((s) => songId(s) === id);

      setLikedSongs((prev) => (already ? prev.filter((s) => songId(s) !== id) : [song, ...prev]));
      toast(already ? "Removed from Liked Songs" : "Added to Liked Songs", "success");

      // Best-effort sync; ignore failure since local state is already source of truth.
      if (already) libraryService.unlike(id);
      else libraryService.like(id);
    },
    [isAuthenticated, openAuthPrompt, likedSongs, toast]
  );

  const recordRecentlyPlayed = useCallback(
    (rawSong) => {
      const song = normalizeSong(rawSong);
      const id = songId(song);
      setRecentlyPlayed((prev) => [song, ...prev.filter((s) => songId(s) !== id)].slice(0, RECENT_LIMIT));
      libraryService.recordPlay(id);
    },
    []
  );

  const clearRecentlyPlayed = useCallback(() => {
    setRecentlyPlayed([]);
    libraryService.clearRecentlyPlayed();
    toast("Recently played cleared", "success");
  }, [toast]);

  const createPlaylist = useCallback(
    async ({ name, description = "", coverImage = "", isPublic = false }) => {
      if (!isAuthenticated) {
        openAuthPrompt("playlist");
        return null;
      }
      const trimmedName = (name || "").trim();
      if (!trimmedName) {
        toast("Give your playlist a name first", "error");
        return null;
      }

      const localPlaylist = {
        id: `local-${Date.now()}`,
        name: trimmedName,
        description,
        coverImage,
        isPublic,
        songs: [],
        createdAt: new Date().toISOString(),
      };

      const remote = await playlistService.create({ name: trimmedName, description, coverImage, isPublic });
      const playlist = remote || localPlaylist;

      setPlaylists((prev) => [playlist, ...prev]);
      toast(`Playlist "${trimmedName}" created`, "success");
      return playlist;
    },
    [isAuthenticated, openAuthPrompt, toast]
  );

  const deletePlaylist = useCallback(
    (id) => {
      setPlaylists((prev) => prev.filter((p) => (p.id || p._id) !== id));
      playlistService.remove(id);
      toast("Playlist deleted", "success");
    },
    [toast]
  );

  const renamePlaylist = useCallback(
    (id, updates) => {
      setPlaylists((prev) =>
        prev.map((p) => ((p.id || p._id) === id ? { ...p, ...updates } : p))
      );
      playlistService.update(id, updates);
    },
    []
  );

  const addSongToPlaylist = useCallback(
    (id, rawSong) => {
      if (!isAuthenticated) {
        openAuthPrompt("playlist");
        return;
      }
      const song = normalizeSong(rawSong);
      let added = false;
      setPlaylists((prev) =>
        prev.map((p) => {
          if ((p.id || p._id) !== id) return p;
          const exists = (p.songs || []).some((s) => songId(s) === songId(song));
          if (exists) return p;
          added = true;
          return { ...p, songs: [...(p.songs || []), song] };
        })
      );
      playlistService.addSong(id, songId(song));
      toast(added ? "Added to playlist" : "Already in this playlist", added ? "success" : "info");
    },
    [isAuthenticated, openAuthPrompt, toast]
  );

  const removeSongFromPlaylist = useCallback(
    (id, rawSong) => {
      const id2 = songId(rawSong);
      setPlaylists((prev) =>
        prev.map((p) =>
          (p.id || p._id) === id ? { ...p, songs: (p.songs || []).filter((s) => songId(s) !== id2) } : p
        )
      );
      playlistService.removeSong(id, id2);
      toast("Removed from playlist", "success");
    },
    [toast]
  );

  const reorderPlaylist = useCallback((id, songs) => {
    setPlaylists((prev) => prev.map((p) => ((p.id || p._id) === id ? { ...p, songs } : p)));
    playlistService.reorder(
      id,
      songs.map((s) => songId(s))
    );
  }, []);

  const value = useMemo(
    () => ({
      loading,
      likedSongs,
      isLiked,
      toggleLike,
      recentlyPlayed,
      recordRecentlyPlayed,
      clearRecentlyPlayed,
      playlists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      reorderPlaylist,
    }),
    [
      loading,
      likedSongs,
      isLiked,
      toggleLike,
      recentlyPlayed,
      recordRecentlyPlayed,
      clearRecentlyPlayed,
      playlists,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      reorderPlaylist,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = () => useContext(LibraryContext);
