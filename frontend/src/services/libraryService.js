import api, { safeRequest } from "./api";

// Expected backend contract (see API_CONTRACT.md):
//   GET    /api/library/liked              -> Song[]
//   POST   /api/library/liked               -> { success: true }  { songId }
//   DELETE /api/library/liked/:songId       -> { success: true }
//   GET    /api/library/recent              -> Song[]  (most recent first, server-capped)
//   POST   /api/library/recent              -> { success: true }  { songId }
//   DELETE /api/library/recent               -> { success: true }  (clear all)
const libraryService = {
  getLiked: () => safeRequest(api.get("/api/library/liked"), null),
  like: (songId) => safeRequest(api.post("/api/library/liked", { songId }), null),
  unlike: (songId) => safeRequest(api.delete(`/api/library/liked/${songId}`), null),

  getRecentlyPlayed: () => safeRequest(api.get("/api/library/recent"), null),
  recordPlay: (songId) => safeRequest(api.post("/api/library/recent", { songId }), null),
  clearRecentlyPlayed: () => safeRequest(api.delete("/api/library/recent"), null),
};

export default libraryService;
