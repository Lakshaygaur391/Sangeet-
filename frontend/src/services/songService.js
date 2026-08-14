import api, { safeRequest } from "./api";

/** Only songs with a direct MP3 audio_url are playable */
const withAudio = (songs) =>
  Array.isArray(songs) ? songs.filter((s) => s?.audio_url) : [];

const songService = {
  getAll: async () => withAudio(await safeRequest(api.get("/api/songs"), [])),
  search: async (query) =>
    withAudio(await safeRequest(api.get("/api/search", { params: { q: query } }), [])),
};

export default songService;
