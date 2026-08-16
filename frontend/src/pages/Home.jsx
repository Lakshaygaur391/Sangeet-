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
import songService, { getCachedHomeFeedSync } from "../services/songService";
import { normalizeSong, getArtistImage } from "../lib/media";

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

  const cachedFeed = getCachedHomeFeedSync();
  const [feed, setFeed] = useState(cachedFeed || null);
  const [status, setStatus] = useState(cachedFeed ? "ready" : "loading");
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  const [bollywoodVisible, setBollywoodVisible] = useState(PAGE_SIZE);
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
  const [extraRegionalSongs, setExtraRegionalSongs] = useState({});
  const [extraBollywood, setExtraBollywood] = useState([]);
  const [loadingBollywoodMore, setLoadingBollywoodMore] = useState(false);
  const [bollywoodPage, setBollywoodPage] = useState(2);
  const [bollywoodHasMore, setBollywoodHasMore] = useState(true);

  const greeting = useMemo(() => GREETINGS[new Date().getDate() % GREETINGS.length], []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getCachedHomeFeedSync()) {
        setStatus("loading");
      }
      const data = await songService.getHomeFeed();
      if (cancelled) return;
      if (!data && !getCachedHomeFeedSync()) {
        setStatus("error");
        return;
      }
      if (data) {
        setFeed(data);
        setStatus("ready");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const featured = useMemo(() => (feed?.featured ? normalizeSong(feed.featured) : null), [feed]);
  const fresh = useMemo(() => (feed?.fresh || []).map(normalizeSong), [feed]);
  const bollywoodSongs = useMemo(() => [...(feed?.bollywood || []).map(normalizeSong), ...extraBollywood], [feed, extraBollywood]);
  const ninetiesSongs = useMemo(() => (feed?.nineties || []).map(normalizeSong), [feed]);
  const twothousandsSongs = useMemo(() => (feed?.twothousands || []).map(normalizeSong), [feed]);
  const trending = useMemo(() => (feed?.trending || []).map(normalizeSong), [feed]);
  const albumsData = useMemo(() => feed?.albums || [], [feed]);
  const allArtists = useMemo(() => (feed?.artists || []).map((a) => ({
    ...a,
    image: a.image || getArtistImage(a.name),
  })), [feed]);

  const otherRegions = useMemo(() => {
    const regionalObj = feed?.regional || {};
    return Object.entries(regionalObj)
      .map(([lang, songsList]) => {
        const extra = extraRegionalSongs[lang] || [];
        return {
          lang,
          songs: [...songsList.map(normalizeSong), ...extra],
        };
      })
      .filter((r) => r.songs.length > 0);
  }, [feed, extraRegionalSongs]);

  const loadMoreBollywood = async () => {
    if (bollywoodVisible < bollywoodSongs.length) {
      setBollywoodVisible((v) => v + PAGE_SIZE);
      return;
    }
    if (!bollywoodHasMore || loadingBollywoodMore) return;
    setLoadingBollywoodMore(true);
    try {
      const res = await songService.getByLanguage("Bollywood", bollywoodPage, PAGE_SIZE);
      if (res && res.songs && res.songs.length > 0) {
        setExtraBollywood((prev) => [...prev, ...res.songs.map(normalizeSong)]);
        setBollywoodPage((p) => p + 1);
        setBollywoodVisible((v) => v + PAGE_SIZE);
        if (res.hasMore === false) setBollywoodHasMore(false);
      } else {
        setBollywoodHasMore(false);
      }
    } catch (e) {
      setBollywoodHasMore(false);
    } finally {
      setLoadingBollywoodMore(false);
    }
  };

  const getRegionVisible = useCallback(
    (lang) => regionVisible[lang] ?? PAGE_SIZE,
    [regionVisible]
  );

  const loadMoreRegion = useCallback(
    async (lang) => {
      const currVisible = getRegionVisible(lang);
      const reg = otherRegions.find((r) => r.lang === lang);
      const localSongs = reg ? reg.songs : [];

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
        const res = await songService.getByLanguage(lang, nextPage, PAGE_SIZE);
        if (res && Array.isArray(res.songs) && res.songs.length > 0) {
          setRegionPage((prev) => ({ ...prev, [lang]: nextPage + 1 }));
          const moreAvailable = res.hasMore !== false;
          setRegionHasMore((prev) => ({ ...prev, [lang]: moreAvailable }));
          setExtraRegionalSongs((prev) => ({
            ...prev,
            [lang]: [...(prev[lang] || []), ...res.songs.map(normalizeSong)],
          }));
          setRegionVisible((prev) => ({ ...prev, [lang]: currVisible + PAGE_SIZE }));
        } else {
          // Fallback to live scraper if DB page runs out
          const scrapeRes = await songService.scrapeCategoryPage(lang, nextPage);
          if (scrapeRes && Array.isArray(scrapeRes.songs) && scrapeRes.songs.length > 0) {
            setRegionPage((prev) => ({ ...prev, [lang]: nextPage + 1 }));
            setExtraRegionalSongs((prev) => ({
              ...prev,
              [lang]: [...(prev[lang] || []), ...scrapeRes.songs.map(normalizeSong)],
            }));
            setRegionVisible((prev) => ({ ...prev, [lang]: currVisible + PAGE_SIZE }));
          } else {
            setRegionHasMore((prev) => ({ ...prev, [lang]: false }));
          }
        }
      } catch (err) {
        console.error(`Live page scrape failed for ${lang}:`, err);
      } finally {
        setRegionScraping((prev) => ({ ...prev, [lang]: false }));
      }
    },
    [getRegionVisible, otherRegions, regionPage]
  );

  const allFeedSongs = useMemo(() => {
    return [
      ...(featured ? [featured] : []),
      ...fresh,
      ...bollywoodSongs,
      ...ninetiesSongs,
      ...twothousandsSongs,
      ...trending,
      ...otherRegions.flatMap((r) => r.songs),
    ];
  }, [featured, fresh, bollywoodSongs, ninetiesSongs, twothousandsSongs, trending, otherRegions]);

  const sectionStatus = status === "loading" ? "loading" : status === "error" ? "error" : allFeedSongs.length === 0 ? "empty" : "ready";

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
            playSong(featured, [featured, ...fresh], 0);
          }}
          className="group relative block w-full overflow-hidden rounded-3xl border border-white/10 text-left shadow-[0_25px_60px_rgba(0,0,0,0.4)] cursor-pointer"
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
          <LoadMoreButton
            onClick={loadMoreBollywood}
            loading={loadingBollywoodMore}
            disabled={!bollywoodHasMore && bollywoodVisible >= bollywoodSongs.length}
            label={loadingBollywoodMore ? "Loading..." : "Load More Bollywood"}
          />
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