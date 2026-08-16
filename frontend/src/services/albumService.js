import api, { safeRequest } from "./api";

const albumService = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return safeRequest(api.get(`/api/albums${qs ? `?${qs}` : ""}`), []);
  },
  getById: (albumName) =>
    safeRequest(api.get(`/api/albums/${encodeURIComponent(albumName)}`), null),
  getYears: (language = "") =>
    safeRequest(api.get(`/api/years${language ? `?language=${encodeURIComponent(language)}` : ""}`), []),
};

export default albumService;
