import api, { safeRequest } from "./api";

const playlistService = {
  getAll: () => safeRequest(api.get("/api/playlists"), null),
  getYears: () => safeRequest(api.get("/api/playlists/years"), null),
  getYear: (year) => safeRequest(api.get(`/api/playlists/year/${year}`), null),
  getById: (id) => safeRequest(api.get(`/api/playlists/${id}`), null),
  create: (payload) => safeRequest(api.post("/api/playlists", payload), null),
  update: (id, payload) => safeRequest(api.patch(`/api/playlists/${id}`, payload), null),
  remove: (id) => safeRequest(api.delete(`/api/playlists/${id}`), null),
  addSong: (id, songId, song) => safeRequest(api.post(`/api/playlists/${id}/songs`, { songId, song }), null),
  removeSong: (id, songId) => safeRequest(api.delete(`/api/playlists/${id}/songs/${songId}`), null),
  reorder: (id, songs) => safeRequest(api.put(`/api/playlists/${id}/reorder`, { songs }), null),
};

export default playlistService;
