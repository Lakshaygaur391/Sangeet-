import api, { safeRequest } from "./api";

const artistService = {
  getAll: () => safeRequest(api.get("/api/artists"), []),
  getByName: async (name) => {
    const artists = await safeRequest(api.get("/api/artists"), []);
    const normalized = decodeURIComponent(name || "").trim().toLowerCase();
    return (artists || []).find((a) => String(a?.name || "").trim().toLowerCase() === normalized) || null;
  },
  follow: (artistId) => safeRequest(api.post(`/api/artists/${artistId}/follow`), null),
  unfollow: (artistId) => safeRequest(api.delete(`/api/artists/${artistId}/follow`), null),
};

export default artistService;
