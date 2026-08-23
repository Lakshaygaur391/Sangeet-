import api, { safeRequest } from "./api";

/** Only songs with a direct MP3 audio_url are playable */
const withAudio = (songs) =>
  Array.isArray(songs) ? songs.filter((s) => s?.audio_url) : [];

/** In-memory fast cache with Stale-While-Revalidate pattern */
let songsCache = null;
let songsCacheTimestamp = 0;
let songsInFlightPromise = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  /** Fetch all songs with 0ms fast in-memory SWR caching */
  getAll: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && songsCache && songsCache.length > 0) {
      // Return cached immediately (0ms), refresh in background if older than 2 minutes
      if (now - songsCacheTimestamp > 2 * 60 * 1000 && !songsInFlightPromise) {
        songsInFlightPromise = safeRequest(api.get("/api/songs"), []).then((res) => {
          const valid = withAudio(res);
          if (valid.length > 0) {
            songsCache = valid;
            songsCacheTimestamp = Date.now();
          }
          songsInFlightPromise = null;
        });
      }
      return songsCache;
    }

    if (songsInFlightPromise) {
      return songsInFlightPromise;
    }

    songsInFlightPromise = (async () => {
      try {
        const raw = await safeRequest(api.get("/api/songs"), []);
        const valid = withAudio(raw);
        if (valid.length > 0) {
          songsCache = valid;
          songsCacheTimestamp = Date.now();
        }
        return valid.length > 0 ? valid : songsCache || [];
      } finally {
        songsInFlightPromise = null;
      }
    })();

    return songsInFlightPromise;
  },

  /** Fetch a paginated page of songs. Returns { songs, total, page, limit, hasMore } or null on error. */
  getPage: async (page = 1, limit = 50) => {
    const res = await safeRequest(api.get("/api/songs", { params: { page, limit } }), null);
    if (!res || !Array.isArray(res.songs)) return null;
    return { ...res, songs: withAudio(res.songs) };
  },

  search: async (query, options = {}) => {
    const { signal, limit = 100 } = options;
    return withAudio(
      await safeRequest(
        api.get("/api/search", {
          params: { q: query, limit },
          signal,
        }),
        []
      )
    );
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
