import api, { safeRequest } from "./api";

const songService = {
  getAll: () => safeRequest(api.get("/api/songs"), []),
  search: (query) => safeRequest(api.get("/api/search", { params: { q: query } }), []),
  searchYoutube: (query) => safeRequest(api.get("/api/search-youtube", { params: { query } }), null),
  resolve: (title, artist) =>
    safeRequest(api.get("/api/resolve-song", { params: { title, artist } }), null),
};

export default songService;
