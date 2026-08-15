import api, { safeRequest } from "./api";

/** Only songs with a direct MP3 audio_url are playable */
const withAudio = (songs) =>
  Array.isArray(songs) ? songs.filter((s) => s?.audio_url) : [];

/**
 * Map human-readable language labels used in UI to the PagalWorld category URL slug.
 * e.g. "Instagram viral song" -> "instagram-viral-song"
 */
const LANG_TO_SLUG = {
  "punjabi": "punjabi",
  "haryanvi": "haryanvi",
  "bollywood": "bollywood",
  "hindi": "hindi",
  "indipop": "indipop",
  "bhojpuri": "bhojpuri",
  "tamil": "tamil",
  "telugu": "telugu",
  "malayalam": "malayalam",
  "kannada": "kannada",
  "english": "english",
  "marathi": "marathi",
  "instagram viral song": "instagram-viral-song",
  "instagram-viral-song": "instagram-viral-song",
};

function langToSlug(lang) {
  const key = (lang || "").trim().toLowerCase();
  return LANG_TO_SLUG[key] || key.replace(/\s+/g, "-");
}

const songService = {
  /** Fetch all songs (full list, no pagination) */
  getAll: async () => withAudio(await safeRequest(api.get("/api/songs"), [])),

  /** Fetch a paginated page of songs. Returns { songs, total, page, limit, hasMore } or null on error. */
  getPage: async (page = 1, limit = 50) => {
    const res = await safeRequest(api.get("/api/songs", { params: { page, limit } }), null);
    if (!res || !Array.isArray(res.songs)) return null;
    return { ...res, songs: withAudio(res.songs) };
  },

  search: async (query) =>
    withAudio(await safeRequest(api.get("/api/search", { params: { q: query } }), [])),

  /** Real-time on-demand scraping of a category page (/category/<name>/page/<page>/) */
  scrapeCategoryPage: async (category, page = 1) => {
    const slug = langToSlug(category);
    const res = await safeRequest(
      api.get(`/api/scrape/category/${encodeURIComponent(slug)}`, {
        params: { page },
        timeout: 90000, // 90s — scraping multiple album pages can be slow
      }),
      null
    );
    if (!res || !Array.isArray(res.songs)) return { success: false, songs: [], hasMore: false };
    return {
      ...res,
      songs: withAudio(res.songs),
    };
  },
};

export default songService;
