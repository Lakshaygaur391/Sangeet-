import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import ArtistCard from "../components/artist/ArtistCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { EmptyState } from "../components/ui/StatePanels";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService, { getCachedCatalogSync, getCachedAlbumsSync, getCachedArtistsSync } from "../services/songService";
import { normalizeSong, getSongDecade, getArtistImage } from "../lib/media";

const GREETINGS = ["Welcome back", "Good to see you", "Ready to listen"];
const PAGE_SIZE = 50;

/** Mini album card component */
const AlbumCard = ({ album }) => (
  <Link
    to={`/album/${encodeURIComponent(album.name)}`}
    className="group w-36 shrink-0 sm:w-40 md:w-44"
  >
    <div className="relative overflow-hidden rounded-2xl bg-white/5 aspect-square shadow-lg transition-transform duration-300 group-hover:scale-[1.04] group-hover:shadow-amber-500/20 group-hover:shadow-xl">
      <img
        src={album.coverImage || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60"}
        alt={album.name}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {album.year && (
        <span className="absolute top-2 right-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-black">
          {album.year}
        </span>
      )}
    </div>
    <div className="mt-2 px-0.5">
      <p className="truncate text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
        {album.name}
      </p>
      <p className="mt-0.5 truncate text-xs text-white/50">
        {album.songCount} {album.songCount === 1 ? "song" : "songs"}{album.language ? ` · ${album.language}` : ""}
      </p>
    </div>
  </Link>
);

const Home = () => {
  const { playSong } = usePlayer();
  const { recentlyPlayed } = useLibrary();
  const { user, isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const cachedCatalog = getCachedCatalogSync();
  const cachedAlbums = getCachedAlbumsSync();
  const cachedArtists = getCachedArtistsSync();

  const [status, setStatus] = useState(cachedCatalog ? "ready" : "loading");
  const [rawSongs, setRawSongs] = useState(cachedCatalog || []);
  const [albumsData, setAlbumsData] = useState(cachedAlbums || []);
  const [artistsData, setArtistsData] = useState(cachedArtists || []);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  const [bollywoodVisible, setBollywoodVisible] = useState(PAGE_SIZE);

  // Per-section visible count state
  const [freshVisible, setFreshVisible] = useState(PAGE_SIZE);
  const [trendingVisible, setTrendingVisible] = useState(PAGE_SIZE);
  const [albumsVisible, setAlbumsVisible] = useState(20);
  const [ninetiesVisible, setNinetiesVisible] = useState(PAGE_SIZE);
  const [twothousandsVisible, setTwothousandsVisible] = useState(PAGE_SIZE);

  // Regional visible count, live page tracker, and scraping indicators
  const [regionVisible, setRegionVisible] = useState({});
  const [regionPage, setRegionPage] = useState({});
  const [regionScraping, setRegionScraping] = useState({});
  const [regionHasMore, setRegionHasMore] = useState({});

  const greeting = useMemo(() => GREETINGS[new Date().getDate() % GREETINGS.length], []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getCachedCatalogSync()) {
        setStatus("loading");
      }
      const [fetchedSongs, fetchedAlbums, fetchedArtists] = await Promise.all([
        songService.getAll(),
        songService.getAlbums(),
        songService.getArtists(),
      ]);
      if (cancelled) return;
      if (fetchedSongs === null && !getCachedCatalogSync()) {
        setStatus("error");
        return;
      }
      if (fetchedSongs) setRawSongs(fetchedSongs);
      if (Array.isArray(fetchedAlbums)) setAlbumsData(fetchedAlbums);
      if (Array.isArray(fetchedArtists)) setArtistsData(fetchedArtists);
      setStatus("ready");
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Strict deduplication ensures every container has unique songs
  const songs = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const raw of rawSongs) {
      const s = normalizeSong(raw);
      const audioKey = (s.audio_url || "").trim().toLowerCase();
      const titleKey = (s.title || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const artistKey = (s.artist || "").trim().toLowerCase().split(/[,&]/)[0].replace(/[^a-z0-9]/g, "");
      const key = audioKey || `${titleKey}::${artistKey}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(s);
    }
    return result;
  }, [rawSongs]);

  const byLanguage = useCallback(
    (lang) =>
      songs.filter((s) => {
        const songLang = (s.language || "").trim().toLowerCase();
        const target = lang.trim().toLowerCase();
        return songLang === target;
      }),
    [songs]
  );

  const featured = songs[0];

  // Fresh on Sangeet (Sorted latest year first: 2026 → 2025 → 2024 → ...)
  const fresh = useMemo(() => {
    const yearOrder = (s) => {
      const y = s.year || s._year || "";
      if (!isNaN(y)) return Number(y);
      if (y === "2010s") return 2010;
      if (y === "90s" || y === "Retro") return 1995;
      return 0;
    };
    return [...songs].sort((a, b) => yearOrder(b) - yearOrder(a));
  }, [songs]);

  const trending = useMemo(() => [...songs].reverse(), [songs]);

  // ── 90s Evergreen Bollywood Spotlight (1990–2000)
  const ninetiesSongs = useMemo(() => {
    return songs.filter((s) => {
      const decade = getSongDecade(s);
      const lang = (s.language || "").toLowerCase();
      return decade === "90s" && (lang === "bollywood" || lang === "hindi" || !lang);
    });
  }, [songs]);

  // ── 2000s Golden Era Bollywood Spotlight (2000–2010)
  const twothousandsSongs = useMemo(() => {
    return songs.filter((s) => {
      const decade = getSongDecade(s);
      const lang = (s.language || "").toLowerCase();
      return decade === "2000s" && (lang === "bollywood" || lang === "hindi" || !lang);
    });
  }, [songs]);

  // ── Bollywood Spotlight (Sorted from Latest 2026/2025 to Oldest)
  const bollywoodSongs = useMemo(() => {
    const list = byLanguage("Bollywood");
    const yearOrder = (s) => {
      const y = s.year || s._year || "";
      if (!isNaN(y)) return Number(y);
      if (y === "2010s") return 2010;
      if (y === "90s" || y === "Retro") return 1995;
      return 0;
    };
    return [...list].sort((a, b) => yearOrder(b) - yearOrder(a));
  }, [byLanguage]);

  // ── Top 100 Artists sorted by most songs first
  const allArtists = useMemo(() => {
    let list;
    if (artistsData && artistsData.length > 0) {
      list = artistsData;
    } else {
      // Fallback: derive dynamic artist cards from catalog
      const artistMap = new Map();
      songs.forEach((s) => {
        const raw = (s.artist || "").trim();
        if (!raw || raw === "Unknown Artist") return;
        const tokens = raw.split(/[,/;&|]|\b(?:ft\.?|feat\.?|featuring|with|and|&)\b/i).map((t) => t.trim()).filter((t) => t.length > 1 && t.length < 50);
        tokens.forEach((art) => {
          const key = art.toLowerCase();
          if (!artistMap.has(key)) {
            artistMap.set(key, { id: art, name: art, image: getArtistImage(art, s.thumbnail_url), songs: [s] });
          } else {
            artistMap.get(key).songs.push(s);
          }
        });
      });
      list = Array.from(artistMap.values());
    }
    // Sort by most songs first, then take top 100
    return [...list]
      .sort((a, b) => {
        const ca = Array.isArray(a.songs) ? a.songs.length : (a.songCount || 0);
        const cb = Array.isArray(b.songs) ? b.songs.length : (b.songCount || 0);
        return cb - ca;
      })
      .slice(0, 100);
  }, [artistsData, songs]);

  // Other regional spotlights
  const otherRegions = [
    "Punjabi",
    "Haryanvi",
    "Indipop",
    "Bhojpuri",
    "Tamil",
    "Telugu",
    "Malayalam",
    "Kannada",
    "Marathi",
    "English",
    "Instagram viral song",
  ].map((lang) => ({
    lang,
    songs: byLanguage(lang),
  })).filter((r) => r.songs.length > 0);

  const sectionStatus = status === "loading" ? "loading" : status === "error" ? "error" : songs.length === 0 ? "empty" : "ready";

  const getRegionVisible = useCallback(
    (lang) => regionVisible[lang] ?? PAGE_SIZE,
    [regionVisible]
  );

  const loadMoreRegion = useCallback(
    async (lang) => {
      const currVisible = getRegionVisible(lang);
      const localSongs = byLanguage(lang);

      if (currVisible < localSongs.length) {
        setRegionVisible((prev) => ({
          ...prev,
          [lang]: currVisible + PAGE_SIZE,
        }));
        return;
      }

      const nextPage = regionPage[lang] ?? 2;
      setRegionScraping((prev) => ({ ...prev, [lang]: true }));

      try {
        const res = await songService.scrapeCategoryPage(lang, nextPage);
        if (res) {
          setRegionPage((prev) => ({ ...prev, [lang]: nextPage + 1 }));
          const moreAvailable = res.hasMore !== false;
          setRegionHasMore((prev) => ({ ...prev, [lang]: moreAvailable }));

          if (Array.isArray(res.songs) && res.songs.length > 0) {
            setRawSongs((prev) => {
              const existingUrls = new Set(prev.map((s) => (s.audio_url || "").toLowerCase()));
              const newSongs = res.songs.filter(
                (s) => s.audio_url && !existingUrls.has(s.audio_url.toLowerCase())
              );
              return newSongs.length > 0 ? [...prev, ...newSongs] : prev;
            });
            setRegionVisible((prev) => ({ ...prev, [lang]: currVisible + PAGE_SIZE }));
          }
        } else {
          setRegionHasMore((prev) => ({ ...prev, [lang]: false }));
        }
      } catch (err) {
        console.error(`Live page scrape failed for ${lang}:`, err);
      } finally {
        setRegionScraping((prev) => ({ ...prev, [lang]: false }));
      }
    },
    [getRegionVisible, byLanguage, regionPage]
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-[#141414] px-5 py-4">
        <p className="text-meta">{greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</p>
        <h1 className="text-display mt-1 text-white">Find your next favourite track</h1>
      </div>

      {status === "ready" && featured && (
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              openAuthPrompt("default");
              return;
            }
            playSong(featured, songs, 0);
          }}
          className="group relative block w-full overflow-hidden rounded-3xl border border-white/10 text-left shadow-[0_25px_60px_rgba(0,0,0,0.4)]"
        >
          <img
            src={featured.thumbnail_url}
            alt=""
            className="h-52 w-full object-cover transition duration-500 group-hover:scale-105 md:h-72"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5 md:p-8">
            <p className="text-meta text-amber-300">Featured Music</p>
            <h2 className="text-h1 mt-1 text-white">{featured.title}</h2>
            <p className="text-body mt-1 text-white/60">{featured.artist}</p>
          </div>
        </button>
      )}

      {/* ── 1. Fresh on Sangeet ── */}
      <div id="fresh" className="space-y-3">
        <Section title="Fresh on Sangeet" eyebrow="Latest releases first" status={sectionStatus} onRetry={() => window.location.reload()}>
          {fresh.slice(0, freshVisible).map((song, i) => (
            <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
              <SongCard song={song} queue={fresh} index={i} onAddToPlaylist={setAddToPlaylistSong} />
            </div>
          ))}
        </Section>
        {sectionStatus === "ready" && fresh.length > freshVisible && (
          <LoadMoreButton
            onClick={() => setFreshVisible((v) => v + PAGE_SIZE)}
            disabled={freshVisible >= fresh.length}
            label="Load More"
          />
        )}
      </div>

      {/* ── 2. Bollywood Spotlight (Sorted Latest to Oldest) ── */}
      {bollywoodSongs.length > 0 && (
        <div id="bollywood-spotlight" className="space-y-3">
          <Section
            title="Bollywood Spotlight"
            eyebrow="Latest releases first"
            status="ready"
          >
            {bollywoodSongs.slice(0, bollywoodVisible).map((song, i) => (
              <div key={song._id || song.audio_url || i} className="w-36 shrink-0 sm:w-40 md:w-44">
                <SongCard song={song} queue={bollywoodSongs} index={i} onAddToPlaylist={setAddToPlaylistSong} />
              </div>
            ))}
          </Section>
          {bollywoodSongs.length > bollywoodVisible && (
            <LoadMoreButton
              onClick={() => setBollywoodVisible((v) => v + PAGE_SIZE)}
              disabled={bollywoodVisible >= bollywoodSongs.length}
              label="Load More Bollywood"
            />
          )}
        </div>
      )}

      {/* ── 3. Dedicated 90s Evergreen Bollywood Spotlight (1990–2000) ── */}
      {ninetiesSongs.length > 0 && (
        <div id="90s-spotlight">
          <Section
            title="90s Evergreen Bollywood"
            eyebrow="Golden 90s Nostalgia (1990–2000)"
            status="ready"
          >
            {ninetiesSongs.slice(0, ninetiesVisible).map((song, i) => (
              <div key={`90s-${song._id || i}`} className="w-36 shrink-0 sm:w-40 md:w-44">
                <SongCard song={song} queue={ninetiesSongs} index={i} onAddToPlaylist={setAddToPlaylistSong} />
              </div>
            ))}
          </Section>
          {ninetiesVisible < ninetiesSongs.length && (
            <LoadMoreButton
              onClick={() => setNinetiesVisible((v) => v + PAGE_SIZE)}
              label="Load More 90s Classics"
            />
          )}
        </div>
      )}

      {/* ── 4. Dedicated 2000s Golden Era Bollywood Spotlight (2000–2010) ── */}
      {twothousandsSongs.length > 0 && (
        <div id="2000s-spotlight">
          <Section
            title="2000s Golden Era Bollywood"
            eyebrow="Melodies of 2000–2010 (KK, Shaan, Mohit Chauhan)"
            status="ready"
          >
            {twothousandsSongs.slice(0, twothousandsVisible).map((song, i) => (
              <div key={`2000s-${song._id || i}`} className="w-36 shrink-0 sm:w-40 md:w-44">
                <SongCard song={song} queue={twothousandsSongs} index={i} onAddToPlaylist={setAddToPlaylistSong} />
              </div>
            ))}
          </Section>
          {twothousandsVisible < twothousandsSongs.length && (
            <LoadMoreButton
              onClick={() => setTwothousandsVisible((v) => v + PAGE_SIZE)}
              label="Load More 2000s Hits"
            />
          )}
        </div>
      )}

      {/* ── 5. Albums & Soundtracks ── */}
      {albumsData.length > 0 && (
        <div id="albums">
          <Section title="Albums &amp; Soundtracks" eyebrow="Browse by movie &amp; album" status="ready">
            {albumsData.slice(0, albumsVisible).map((album) => (
              <AlbumCard key={album._id || album.name} album={album} />
            ))}
          </Section>
          {albumsVisible < albumsData.length && (
            <LoadMoreButton
              onClick={() => setAlbumsVisible((v) => v + 20)}
              label="Load More Albums"
            />
          )}
        </div>
      )}

      {/* ── 6. Trending in India ── */}
      <Section title="Trending in India" eyebrow="Hot right now" status={sectionStatus} seeAllHref="/discover" id="trending">
        {trending.slice(0, trendingVisible).map((song, i) => (
          <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
            <SongCard song={song} queue={trending} index={i} onAddToPlaylist={setAddToPlaylistSong} />
          </div>
        ))}
      </Section>
      {sectionStatus === "ready" && (
        <LoadMoreButton
          onClick={() => setTrendingVisible((v) => v + PAGE_SIZE)}
          disabled={trendingVisible >= trending.length}
          label="Load More"
        />
      )}

      {/* ── 7. Regional Spotlights (Punjabi, Haryanvi, Indipop, etc.) ── */}
      {status === "ready" && otherRegions.length === 0 ? (
        <EmptyState title="No regional music yet" description="Regional collections will appear once songs are tagged with a language." />
      ) : (
        <div id="regional" className="scroll-mt-24 space-y-4 md:space-y-6">
          {otherRegions.map((region) => {
            const visible = getRegionVisible(region.lang);
            const remaining = region.songs.length - visible;
            const isScraping = regionScraping[region.lang] || false;
            const noMorePages = regionHasMore[region.lang] === false;

            return (
              <div key={region.lang}>
                <Section title={`${region.lang} Spotlight`} eyebrow="Regional Spotlight" status="ready">
                  {region.songs.slice(0, visible).map((song, i) => (
                    <div key={song._id || song.audio_url || i} className="w-36 shrink-0 sm:w-40 md:w-44">
                      <SongCard song={song} queue={region.songs} index={i} onAddToPlaylist={setAddToPlaylistSong} />
                    </div>
                  ))}
                </Section>
                <LoadMoreButton
                  onClick={() => loadMoreRegion(region.lang)}
                  loading={isScraping}
                  disabled={!isScraping && noMorePages && remaining <= 0}
                  label={isScraping ? "Loading..." : "Load More"}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── 8. Top Artists ── */}
      {allArtists.length > 0 && (
        <Section
          id="artists"
          title="Top Artists"
          eyebrow="Most popular on Sangeet"
          status="ready"
        >
          {allArtists.map((artist) => (
            <ArtistCard key={artist.name || artist.id} artist={artist} />
          ))}
        </Section>
      )}

      {/* ── 9. Recently Played ── */}
      {recentlyPlayed.length > 0 && (
        <Section title="Recently Played" status="ready" seeAllHref="/library/recent">
          {recentlyPlayed.slice(0, 10).map((song, i) => (
            <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
              <SongCard song={song} queue={recentlyPlayed} index={i} onAddToPlaylist={setAddToPlaylistSong} />
            </div>
          ))}
        </Section>
      )}

      <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />
    </div>
  );
};

export default Home;