import api, { safeRequest } from "./api";

// Album endpoints are optional — if the backend doesn't implement them yet,
// every call here resolves to a safe empty value instead of throwing, and
// the Album page renders an empty state rather than crashing.
const albumService = {
  getAll: () => safeRequest(api.get("/api/albums"), []),
  getById: (albumId) => safeRequest(api.get(`/api/albums/${albumId}`), null),
};

export default albumService;
