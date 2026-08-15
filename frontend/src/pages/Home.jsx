import { useEffect, useMemo, useState, useCallback } from "react";
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
import songService from "../services/songService";
import { normalizeSong } from "../lib/media";

// Curated list of featured artists — static, no API call needed
const FEATURED_ARTISTS = [
  { name: "Arijit Singh",    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Arijit_Singh_live_performance_in_2024.jpg/440px-Arijit_Singh_live_performance_in_2024.jpg", verified: true },
  { name: "Diljit Dosanjh",  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Diljit_Dosanjh_2023.jpg/440px-Diljit_Dosanjh_2023.jpg", verified: true },
  { name: "Badshah",         image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Badshah_2023.jpg/440px-Badshah_2023.jpg", verified: true },
  { name: "Shreya Ghoshal",  image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Shreya_Ghoshal_2023.jpg/440px-Shreya_Ghoshal_2023.jpg", verified: true },
  { name: "Neha Kakkar",     image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Neha_Kakkar_2022.jpg/440px-Neha_Kakkar_2022.jpg", verified: true },
  { name: "Guru Randhawa",   image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Guru_Randhawa_2019.jpg/440px-Guru_Randhawa_2019.jpg", verified: true },
  { name: "Ap Dhillon",      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/AP_Dhillon_2023.jpg/440px-AP_Dhillon_2023.jpg", verified: true },
  { name: "Masoom Sharma",   image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80", verified: true },
  { name: "Khasa Aala Chahar", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80", verified: true },
  { name: "Renuka Panwar",   image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80", verified: true },
  { name: "R Nait",          image: "https://images.unsplash.com/photo-1571266028243-d220c6a7a2d0?w=400&auto=format&fit=crop&q=80", verified: true },
  { name: "Sumit Goswami",   image: "https://images.unsplash.com/photo-1598387993441-a364f854ceba?w=400&auto=format&fit=crop&q=80", verified: true },
];

const GREETINGS = ["Welcome back", "Good to see you", "Ready to listen"];
const PAGE_SIZE = 50; // songs revealed per Load More click

const Home = () => {
  const { playSong } = usePlayer();
  const { recentlyPlayed } = useLibrary();
  const { user, isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [status, setStatus] = useState("loading");
  const [rawSongs, setRawSongs] = useState([]);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  // Per-section visible count state
  const [freshVisible, setFreshVisible] = useState(PAGE_SIZE);
  const [trendingVisible, setTrendingVisible] = useState(PAGE_SIZE);
  
  // Regional visible count, live page tracker, and scraping indicators
  const [regionVisible, setRegionVisible] = useState({});
  const [regionPage, setRegionPage] = useState({});
  const [regionScraping, setRegionScraping] = useState({});
  const [regionHasMore, setRegionHasMore] = useState({});

  const greeting = useMemo(() => GREETINGS[new Date().getDate() % GREETINGS.length], []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      const fetchedSongs = await songService.getAll();
      if (cancelled) return;
      if (fetchedSongs === null) {
        setStatus("error");
        return;
      }
      setRawSongs(fetchedSongs);
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
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
  const fresh = songs;
  const trending = useMemo(() => [...songs].reverse(), [songs]);

  // Show language spotlights in priority order; only include those with songs
  const regions = [
    "Punjabi",
    "Haryanvi",
    "Bollywood",
    "Hindi",
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

  /**
   * Realtime load more handler:
   * 1. Shows remaining songs in local memory first.
   * 2. When end is reached, dynamically fetches the next page live from PagalWorld and saves to DB in real-time!
   */
  const loadMoreRegion = useCallback(
    async (lang) => {
      const currVisible = getRegionVisible(lang);
      const localSongs = byLanguage(lang);

      // If we still have unrevealed songs in local memory, reveal them immediately
      if (currVisible < localSongs.length) {
        setRegionVisible((prev) => ({
          ...prev,
          [lang]: currVisible + PAGE_SIZE,
        }));
        return;
      }

      // If all local songs are displayed, trigger real-time on-demand scraping of the next page!
      const nextPage = regionPage[lang] ?? 2;
      setRegionScraping((prev) => ({ ...prev, [lang]: true }));

      try {
        const res = await songService.scrapeCategoryPage(lang, nextPage);
        if (res) {
          // Always advance the page counter regardless of how many songs were returned
          // (songs might already exist in DB from a previous scrape)
          setRegionPage((prev) => ({ ...prev, [lang]: nextPage + 1 }));

          // Update hasMore from API — API knows total page count
          const moreAvailable = res.hasMore !== false;
          setRegionHasMore((prev) => ({ ...prev, [lang]: moreAvailable }));

          if (Array.isArray(res.songs) && res.songs.length > 0) {
            // New songs found! Append to catalog and reveal more
            setRawSongs((prev) => {
              const existingUrls = new Set(prev.map((s) => (s.audio_url || "").toLowerCase()));
              const newSongs = res.songs.filter(
                (s) => s.audio_url && !existingUrls.has(s.audio_url.toLowerCase())
              );
              return newSongs.length > 0 ? [...prev, ...newSongs] : prev;
            });
            setRegionVisible((prev) => ({ ...prev, [lang]: currVisible + PAGE_SIZE }));
          }
          // If 0 songs returned but hasMore=true, user can click again for next page
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

      {/* ── Fresh on Sangeet ── */}
      <Section title="Fresh on Sangeet" eyebrow="Just added" status={sectionStatus} onRetry={() => window.location.reload()} id="fresh">
        {fresh.slice(0, freshVisible).map((song, i) => (
          <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
            <SongCard song={song} queue={fresh} index={i} onAddToPlaylist={setAddToPlaylistSong} />
          </div>
        ))}
      </Section>
      {sectionStatus === "ready" && (
        <LoadMoreButton
          onClick={() => setFreshVisible((v) => v + PAGE_SIZE)}
          disabled={freshVisible >= fresh.length}
          label="Load More"
        />
      )}

      {recentlyPlayed.length > 0 && (
        <Section title="Your Sound" eyebrow="Because you listened" status="ready">
          {recentlyPlayed.slice(0, 12).map((song, i) => (
            <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
              <SongCard song={song} queue={recentlyPlayed} index={i} onAddToPlaylist={setAddToPlaylistSong} />
            </div>
          ))}
        </Section>
      )}

      {/* ── Trending in India ── */}
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

      {/* ── Regional Spotlights with Realtime Scraping on Load More ── */}
      {status === "ready" && regions.length === 0 ? (
        <EmptyState title="No regional music yet" description="Regional collections will appear once songs are tagged with a language." />
      ) : (
        <div id="regional" className="scroll-mt-24 space-y-4 md:space-y-6">
          {regions.map((region) => {
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
                  disabled={noMorePages && remaining <= 0}
                  label={isScraping ? "Loading..." : "Load More"}
                />
              </div>
            );
          })}
        </div>
      )}

      <Section
        title="Artists to Explore"
        status="ready"
        id="artists"
      >
        {FEATURED_ARTISTS.map((artist) => (
          <ArtistCard key={artist.name} artist={artist} />
        ))}
      </Section>

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