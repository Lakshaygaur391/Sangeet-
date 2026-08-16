import api, { safeRequest } from "./api";

/** Only songs with a direct MP3 audio_url are playable */
const withAudio = (songs) =>
  Array.isArray(songs) ? songs.filter((s) => s?.audio_url) : [];

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

// ── Module-level singleton cache ──────────────────────────────────────────────
// Lives for the entire browser session — survives React unmounts/remounts.
// Home page reads from here instantly on every re-visit (zero loading delay).

let _homeFeedCache = null;
let _homeFeedPromise = null;

try {
  const stored = sessionStorage.getItem("sangeet_home_feed");
  if (stored) {
    _homeFeedCache = JSON.parse(stored);
  }
} catch (e) {}

let _catalogCache = null;    // resolved song array
let _catalogPromise = null;  // in-flight promise (prevents duplicate network calls)
let _albumsCache = null;
let _albumsPromise = null;
let _artistsCache = null;
let _artistsPromise = null;

/** Pre-warm the fast Home Feed immediately on startup (compact ~200KB payload) */
export function prefetchHomeFeed() {
  if (_homeFeedPromise) return _homeFeedPromise;
  _homeFeedPromise = safeRequest(api.get("/api/feed/home"), null).then((data) => {
    if (data && typeof data === "object") {
      _homeFeedCache = data;
      try {
        sessionStorage.setItem("sangeet_home_feed", JSON.stringify(data));
      } catch (e) {}
    }
    _homeFeedPromise = null;
    return _homeFeedCache;
  });
  return _homeFeedPromise;
}

export function getCachedHomeFeedSync() {
  return _homeFeedCache;
}

/** Pre-warm caches on-demand */
export function prefetchCatalog() {
  if (_catalogCache || _catalogPromise) return;
  _catalogPromise = safeRequest(api.get("/api/songs"), []).then((data) => {
    _catalogCache = withAudio(data);
    _catalogPromise = null;
    return _catalogCache;
  });
}

export function prefetchAlbums() {
  if (_albumsCache || _albumsPromise) return;
  _albumsPromise = safeRequest(api.get("/api/albums"), []).then((data) => {
    _albumsCache = Array.isArray(data) ? data : [];
    _albumsPromise = null;
    return _albumsCache;
  });
}

export function prefetchArtists() {
  if (_artistsCache || _artistsPromise) return;
  _artistsPromise = safeRequest(api.get("/api/artists"), []).then((data) => {
    _artistsCache = Array.isArray(data) ? data : [];
    _artistsPromise = null;
    return _artistsCache;
  });
}

/** Append live-scraped songs to the catalog cache so Home stays fresh */
export function appendToCatalogCache(newSongs) {
  if (!_catalogCache) return;
  const existingUrls = new Set(_catalogCache.map((s) => (s.audio_url || "").toLowerCase()));
  const fresh = withAudio(newSongs).filter(
    (s) => s.audio_url && !existingUrls.has(s.audio_url.toLowerCase())
  );
  if (fresh.length > 0) _catalogCache = [..._catalogCache, ...fresh];
}

/** Synchronous cache getters for instant, zero-delay component state initialization */
export function getCachedCatalogSync() {
  return _catalogCache;
}

export function getCachedAlbumsSync() {
  return _albumsCache;
}

export function getCachedArtistsSync() {
  return _artistsCache;
}

// ─────────────────────────────────────────────────────────────────────────────

const clientSearchCache = new Map();
const MAX_CLIENT_CACHE_ENTRIES = 120;

export function getCachedSearchResults(query) {
  const key = (query || "").trim().toLowerCase();
  return clientSearchCache.get(key) || null;
}

const songService = {
  /** Returns lightweight Home Feed with zero lag */
  getHomeFeed: () => {
    if (_homeFeedCache) return Promise.resolve(_homeFeedCache);
    if (_homeFeedPromise) return _homeFeedPromise;
    return prefetchHomeFeed();
  },

  /** Returns catalog instantly from cache on re-visits; fetches on demand */
  getAll: () => {
    if (_catalogCache) return Promise.resolve(_catalogCache);
    if (_catalogPromise) return _catalogPromise;
    _catalogPromise = safeRequest(api.get("/api/songs"), []).then((data) => {
      _catalogCache = withAudio(data);
      _catalogPromise = null;
      return _catalogCache;
    });
    return _catalogPromise;
  },

  /** Returns albums instantly from cache on re-visits */
  getAlbums: () => {
    if (_albumsCache) return Promise.resolve(_albumsCache);
    if (_albumsPromise) return _albumsPromise;
    _albumsPromise = safeRequest(api.get("/api/albums"), []).then((data) => {
      _albumsCache = Array.isArray(data) ? data : [];
      _albumsPromise = null;
      return _albumsCache;
    });
    return _albumsPromise;
  },

  /** Returns all artists dynamically with their photos */
  getArtists: () => {
    if (_artistsCache) return Promise.resolve(_artistsCache);
    if (_artistsPromise) return _artistsPromise;
    _artistsPromise = safeRequest(api.get("/api/artists"), []).then((data) => {
      _artistsCache = Array.isArray(data) ? data : [];
      _artistsPromise = null;
      return _artistsCache;
    });
    return _artistsPromise;
  },

  /** Fetch songs by language with server-side pagination */
  getByLanguage: async (language, page = 1, limit = 50) => {
    const res = await safeRequest(
      api.get(`/api/songs/language/${encodeURIComponent(language)}`, { params: { page, limit } }),
      null
    );
    if (!res) return { songs: [], hasMore: false, total: 0 };
    if (Array.isArray(res)) return { songs: withAudio(res), hasMore: false, total: res.length };
    return { ...res, songs: withAudio(res.songs) };
  },

  /** Fetch a paginated page of songs. Returns { songs, total, page, limit, hasMore } or null */
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

    if (res === null) return null;

    const songs = withAudio(res);
    if (clientSearchCache.size >= MAX_CLIENT_CACHE_ENTRIES) {
      const firstKey = clientSearchCache.keys().next().value;
      if (firstKey) clientSearchCache.delete(firstKey);
    }
    clientSearchCache.set(cacheKey, songs);
    return songs;
  },

  /** Real-time on-demand scraping of a category page */
  scrapeCategoryPage: async (category, page = 1) => {
    const slug = langToSlug(category);
    const res = await safeRequest(
      api.get(`/api/scrape/category/${encodeURIComponent(slug)}`, {
        params: { page },
        timeout: 90000,
      }),
      null
    );
    if (!res || !Array.isArray(res.songs)) return { success: false, songs: [], hasMore: false };
    const songs = withAudio(res.songs);
    appendToCatalogCache(songs); // keep cache warm with new songs
    return { ...res, songs };
  },
};

export default songService;
