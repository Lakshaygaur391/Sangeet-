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

const clientSearchCache = new Map();
const MAX_CLIENT_CACHE_ENTRIES = 120;

export function getCachedSearchResults(query) {
  const key = (query || "").trim().toLowerCase();
  return clientSearchCache.get(key) || null;
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

  search: async (query, signal) => {
    const cleanQuery = (query || "").trim();
    if (!cleanQuery) return [];
    const cacheKey = cleanQuery.toLowerCase();

    if (clientSearchCache.has(cacheKey)) {
      return clientSearchCache.get(cacheKey);
    }

    const res = await safeRequest(
      api.get("/api/search", { params: { q: cleanQuery }, signal }),
      null
    );

    if (res === null) {
      return null;
    }

    const songs = withAudio(res);
    if (clientSearchCache.size >= MAX_CLIENT_CACHE_ENTRIES) {
      const firstKey = clientSearchCache.keys().next().value;
      if (firstKey) clientSearchCache.delete(firstKey);
    }
    clientSearchCache.set(cacheKey, songs);
    return songs;
  },

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
