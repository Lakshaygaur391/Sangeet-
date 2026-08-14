import api, { safeRequest } from "./api";

// Expected backend contract (see API_CONTRACT.md):
//   GET    /api/playlists                 -> Playlist[]
//   POST   /api/playlists                 -> Playlist          { name, description, coverImage, isPublic }
//   GET    /api/playlists/:id             -> Playlist
//   PATCH  /api/playlists/:id             -> Playlist          { name?, description?, coverImage?, isPublic? }
//   DELETE /api/playlists/:id             -> { success: true }
//   POST   /api/playlists/:id/songs       -> Playlist          { songId }
//   DELETE /api/playlists/:id/songs/:songId -> Playlist
//   PATCH  /api/playlists/:id/reorder     -> Playlist          { songIds: string[] }
const playlistService = {
  getAll: () => safeRequest(api.get("/api/playlists"), null),
  getById: (id) => safeRequest(api.get(`/api/playlists/${id}`), null),
  create: (payload) => safeRequest(api.post("/api/playlists", payload), null),
  update: (id, payload) => safeRequest(api.patch(`/api/playlists/${id}`, payload), null),
  remove: (id) => safeRequest(api.delete(`/api/playlists/${id}`), null),
  addSong: (id, songId) => safeRequest(api.post(`/api/playlists/${id}/songs`, { songId }), null),
  removeSong: (id, songId) => safeRequest(api.delete(`/api/playlists/${id}/songs/${songId}`), null),
  reorder: (id, songIds) => safeRequest(api.patch(`/api/playlists/${id}/reorder`, { songIds }), null),
};

export default playlistService;
