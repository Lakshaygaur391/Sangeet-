import api, { safeRequest } from "./api";

let artistsCache = null;
let artistsCacheTimestamp = 0;
let artistsInFlightPromise = null;

const artistService = {
  getAll: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && artistsCache && artistsCache.length > 0) {
      if (now - artistsCacheTimestamp > 3 * 60 * 1000 && !artistsInFlightPromise) {
        artistsInFlightPromise = safeRequest(api.get("/api/artists"), []).then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            artistsCache = res;
            artistsCacheTimestamp = Date.now();
          }
          artistsInFlightPromise = null;
        });
      }
      return artistsCache;
    }

    if (artistsInFlightPromise) {
      return artistsInFlightPromise;
    }

    artistsInFlightPromise = (async () => {
      try {
        const res = await safeRequest(api.get("/api/artists"), []);
        if (Array.isArray(res) && res.length > 0) {
          artistsCache = res;
          artistsCacheTimestamp = Date.now();
        }
        return Array.isArray(res) && res.length > 0 ? res : artistsCache || [];
      } finally {
        artistsInFlightPromise = null;
      }
    })();

    return artistsInFlightPromise;
  },

  getByName: async (name) => {
    const artists = await artistService.getAll();
    const normalized = decodeURIComponent(name || "").trim().toLowerCase();
    return (artists || []).find((a) => String(a?.name || "").trim().toLowerCase() === normalized) || null;
  },

  follow: (artistId) => safeRequest(api.post(`/api/artists/${artistId}/follow`), null),
  unfollow: (artistId) => safeRequest(api.delete(`/api/artists/${artistId}/follow`), null),
};

export default artistService;
