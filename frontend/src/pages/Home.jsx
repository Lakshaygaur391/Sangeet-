import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  IoPlay,
  IoPause,
  IoShuffle,
  IoSparkles,
  IoFlame,
  IoTrendingUp,
  IoChevronForward,
  IoMusicalNotes,
  IoCompassOutline,
  IoTimeOutline,
} from "react-icons/io5";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import ArtistCard from "../components/artist/ArtistCard";
import PlaylistCard from "../components/playlist/PlaylistCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import { EmptyState } from "../components/ui/StatePanels";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService, { getCachedHomeFeedSync } from "../services/songService";
import artistService from "../services/artistService";
import { normalizeSong, songId, getArtistImage } from "../lib/media";

const GREETINGS = ["Welcome back", "Good to see you", "Ready to listen", "Turn up the volume"];
const RAIL_PREVIEW_LIMIT = 20;

const SPOTLIGHT_SUBTITLES = {
  "Bollywood": "Timeless blockbusters & unforgettable movie melodies",
  "Punjabi": "The latest Punjabi anthems, bhangra beats & chart-toppers",
  "Hindi": "Popular & evergreen Hindi melodies and chart-busters",
  "Haryanvi": "High-energy beats & folk melodies from Haryana",
  "Instagram viral song": "Trending sounds dominating reels & social feeds",
  "Indipop": "Independent pop music and non-film hits",
  "Bhojpuri": "Festive dance tracks & viral regional hits",
  "Tamil": "Kollywood soundtrack favorites & melodies",
  "Telugu": "Tollywood chart-busters & energetic hits",
  "Malayalam": "Soulful Mollywood melodies & indie gems",
  "Kannada": "Sandalwood hits & beloved tracks",
  "Marathi": "Vibrant Marathi folk & film songs",
  "English": "Global pop, hip-hop & international hits",
};

const HOME_FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "trending", label: "Top Charts" },
  { key: "fresh", label: "New Drops" },
  { key: "regional", label: "Regional Hub" },
  { key: "yearly", label: "Yearly Rewind" },
  { key: "artists", label: "Artists" },
];

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
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const { recentlyPlayed, yearlyPlaylists } = useLibrary();
  const { user, isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const cachedFeed = getCachedHomeFeedSync();
  const [feed, setFeed] = useState(cachedFeed || null);
  const [status, setStatus] = useState(cachedFeed ? "ready" : "loading");
  const [artists, setArtists] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [activeRegion, setActiveRegion] = useState("Bollywood");
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  const greeting = useMemo(() => GREETINGS[new Date().getDate() % GREETINGS.length], []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getCachedHomeFeedSync()) {
        setStatus("loading");
      }
      const [feedData, fetchedArtists] = await Promise.all([
        songService.getHomeFeed(),
        artistService.getAll(),
      ]);

      if (cancelled) return;
      if (!feedData && !getCachedHomeFeedSync()) {
        setStatus("error");
        return;
      }
      if (feedData) {
        setFeed(feedData);
      }
      if (Array.isArray(fetchedArtists) && fetchedArtists.length > 0) {
        setArtists(fetchedArtists);
      }
      setStatus("ready");
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const yearNum = (s) => {
    const y = parseInt(s?.year || "", 10);
    return isNaN(y) ? 0 : y;
  };

  const featured = useMemo(() => (feed?.featured ? normalizeSong(feed.featured) : null), [feed]);

  // Fresh on Sangeet: Latest Hindi / Bollywood songs year-wise first
  const fresh = useMemo(() => {
    const list = (feed?.bollywood && feed.bollywood.length > 0)
      ? feed.bollywood
      : (feed?.fresh || []);
    return list
      .map(normalizeSong)
      .filter((s) => (s.language || "").toLowerCase() === "bollywood")
      .sort((a, b) => yearNum(b) - yearNum(a));
  }, [feed]);

  // Trending in India: Mix of all languages sorted latest year first
  // Trending in India: Latest Bollywood songs only, sorted by year descending
  const trending = useMemo(() => {
    const list = feed?.trending || [];
    return list
      .map(normalizeSong)
      .filter((s) => (s.language || "").toLowerCase() === "bollywood")
      .sort((a, b) => yearNum(b) - yearNum(a));
  }, [feed]);

  const bollywoodSongs = useMemo(() => (feed?.bollywood || []).map(normalizeSong), [feed]);
  const albumsData = useMemo(() => feed?.albums || [], [feed]);

  // Regional language spotlights
  const regions = useMemo(() => {
    const regionalObj = feed?.regional || {};
    return Object.entries(regionalObj)
      .map(([lang, songsList]) => ({
        lang,
        label: lang === "Instagram viral song" ? "Viral Hits" : lang,
        subtitle: SPOTLIGHT_SUBTITLES[lang] || `Latest ${lang} tracks`,
        slug: lang.toLowerCase().replace(/\s+/g, "-"),
        songs: (songsList || []).map(normalizeSong),
      }))
      .filter((r) => r.songs.length > 0);
  }, [feed]);

  // Set default active region if current selection is empty
  useEffect(() => {
    if (regions.length > 0 && !regions.some((r) => r.lang === activeRegion)) {
      setActiveRegion(regions[0].lang);
    }
  }, [regions, activeRegion]);

  const selectedRegionData = useMemo(() => {
    return regions.find((r) => r.lang === activeRegion) || regions[0] || null;
  }, [regions, activeRegion]);

  const byLanguage = useCallback(
    (lang) => {
      const reg = regions.find((r) => r.lang.toLowerCase() === lang.toLowerCase());
      return reg ? reg.songs : [];
    },
    [regions]
  );

  // Spotify-style 6 Quick Launch cards
  const quickMixCards = useMemo(() => {
    const items = [];

    if (recentlyPlayed.length > 0) {
      items.push({
        title: "Recently Played",
        subtitle: `${recentlyPlayed.length} songs`,
        image: recentlyPlayed[0]?.thumbnail_url,
        songs: recentlyPlayed,
        href: "/library/recent",
      });
    }

    const bollywood = bollywoodSongs.length > 0 ? bollywoodSongs : byLanguage("Bollywood");
    if (bollywood.length > 0) {
      items.push({
        title: "Bollywood Blockbusters",
        subtitle: "Top movie anthems",
        image: bollywood[0]?.thumbnail_url,
        songs: bollywood,
        href: "/playlist/spotlight-bollywood",
      });
    }

    const punjabi = byLanguage("Punjabi");
    if (punjabi.length > 0) {
      items.push({
        title: "Punjabi Hits",
        subtitle: "High-energy tracks",
        image: punjabi[0]?.thumbnail_url,
        songs: punjabi,
        href: "/playlist/spotlight-punjabi",
      });
    }

    const haryanvi = byLanguage("Haryanvi");
    if (haryanvi.length > 0) {
      items.push({
        title: "Haryanvi Beats",
        subtitle: "Folk & modern drops",
        image: haryanvi[0]?.thumbnail_url,
        songs: haryanvi,
        href: "/playlist/spotlight-haryanvi",
      });
    }

    if (trending.length > 0) {
      items.push({
        title: "Top Trending India",
        subtitle: "Viral chart-toppers",
        image: trending[0]?.thumbnail_url,
        songs: trending,
        href: "/playlist/spotlight-trending",
      });
    }

    if (yearlyPlaylists.length > 0) {
      const yp = yearlyPlaylists[0];
      const ySongs = yp?.songs || [];
      const fallbackImg = fresh.find((s) => s.year === "2026" || s.year === 2026)?.thumbnail_url || fresh[0]?.thumbnail_url;
      items.push({
        title: `${yp.name || "2026"} Rewind`,
        subtitle: `${ySongs.length || 20} top songs`,
        image: yp.thumbnail_url || yp.coverImage || ySongs[0]?.thumbnail_url || fallbackImg,
        songs: ySongs.length > 0 ? ySongs : fresh.slice(0, 20),
        href: `/playlist/${yp.id || yp._id || "yearly"}`,
      });
    } else if (fresh.length > 0) {
      const fallbackImg = fresh.find((s) => s.year === "2026" || s.year === 2026)?.thumbnail_url || fresh[0]?.thumbnail_url;
      items.push({
        title: "2026 Rewind",
        subtitle: "Top chart songs",
        image: fallbackImg,
        songs: fresh.slice(0, 20),
        href: "/library",
      });
    }

    return items.slice(0, 6);
  }, [fresh, recentlyPlayed, bollywoodSongs, byLanguage, trending, yearlyPlaylists]);

  const displayArtists = useMemo(() => {
    if (artists.length > 0) {
      return artists.slice(0, 18);
    }
    return (feed?.artists || []).map((a) => ({
      ...a,
      image: a.image || getArtistImage(a.name),
    })).slice(0, 18);
  }, [artists, feed]);

  const sectionStatus =
    status === "loading"
      ? "loading"
      : status === "error"
        ? "error"
        : fresh.length === 0 && trending.length === 0
          ? "empty"
          : "ready";

  const handlePlayCollection = (collectionSongs) => {
    if (!collectionSongs?.length) return;
    if (!isAuthenticated) {
      openAuthPrompt("default");
      return;
    }
    playSong(collectionSongs[0], collectionSongs, 0);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-12">
      {/* ── Greeting Header & Filter Navigation Bar ── */}
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-amber-500/10 via-amber-400/[0.03] to-transparent p-5 sm:p-7 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,74,0.12),transparent_55%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-meta font-extrabold tracking-widest text-amber-400">
                {greeting}
                {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </p>
              <h1 className="text-display mt-1 font-black text-white text-2xl sm:text-3xl md:text-4xl">
                Find your next favourite track
              </h1>
            </div>

            {/* Quick Explore Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => navigate("/discover")}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/10 hover:border-amber-400/40 hover:scale-105 active:scale-95"
              >
                <IoCompassOutline className="text-sm text-amber-300" /> Discover
              </button>
              <button
                type="button"
                onClick={() => navigate("/library")}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/10 hover:border-amber-400/40 hover:scale-105 active:scale-95"
              >
                <IoMusicalNotes className="text-sm text-amber-300" /> Your Library
              </button>
            </div>
          </div>
        </div>

        {/* Home Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {HOME_FILTER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${activeTab === t.key
                ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-105"
                : "border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Spotify-Style 6-Pack Quick Play Grid ── */}
      {(activeTab === "all" || activeTab === "fresh") && quickMixCards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickMixCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => navigate(card.href)}
              className="group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141416]/80 p-2 shadow-md transition-all duration-300 hover:border-white/20 hover:bg-[#1a1a1e] hover:shadow-xl"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={card.image}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-md transition-transform duration-300 group-hover:scale-105"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                    {card.title}
                  </p>
                  <p className="truncate text-xs text-white/50">{card.subtitle}</p>
                </div>
              </div>

              {/* Floating Quick Play Button */}
              <button
                type="button"
                aria-label={`Play ${card.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayCollection(card.songs);
                }}
                className="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg opacity-0 shadow-amber-500/25 transition-all duration-200 group-hover:opacity-100 group-hover:scale-105 active:scale-95"
              >
                <IoPlay className="text-base translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Featured Hero Showcase Banner ── */}
      {(activeTab === "all" || activeTab === "fresh") && status === "ready" && featured && (
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121214] shadow-2xl group">
          <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
            <img
              src={featured.thumbnail_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,74,0.15),transparent_60%)]" />

            <div className="absolute bottom-0 left-0 p-6 sm:p-8 md:p-10 max-w-2xl">
              {featured.language && (
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
                  {featured.language} Spotlight
                </span>
              )}

              <h2 className="text-h1 mt-2 font-black text-white truncate drop-shadow-md" title={featured.title}>
                {featured.title}
              </h2>
              <p className="text-body mt-1 text-white/70 line-clamp-1">{featured.artist}</p>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthPrompt("default");
                      return;
                    }
                    playSong(featured, [featured, ...fresh], 0);
                  }}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-7 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <IoPlay className="translate-x-0.5 text-lg" />
                  <span>Listen Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthPrompt("default");
                      return;
                    }
                    const shuffled = [...fresh].sort(() => 0.5 - Math.random());
                    playSong(shuffled[0], shuffled, 0);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-md transition hover:border-white/40 hover:bg-black/60 hover:text-white active:scale-95"
                  aria-label="Shuffle play"
                >
                  <IoShuffle className="text-xl" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section: Fresh on Sangeet (New Drops) ── */}
      {(activeTab === "all" || activeTab === "fresh") && (
        <Section
          title="Fresh on Sangeet"
          eyebrow="New Releases"
          subtitle="New music and freshly added drops sorted by latest release year"
          status={sectionStatus}
          seeAllHref="/playlist/spotlight-fresh"
          onRetry={() => window.location.reload()}
          id="fresh"
        >
          {fresh.slice(0, RAIL_PREVIEW_LIMIT).map((song, i) => (
            <div key={songId(song) || i} className="w-40 shrink-0 sm:w-44 md:w-48">
              <SongCard
                song={song}
                queue={fresh}
                index={i}
                onAddToPlaylist={setAddToPlaylistSong}
              />
            </div>
          ))}
        </Section>
      )}

      {/* ── Section: Trending in India (Top Charts) ── */}
      {(activeTab === "all" || activeTab === "trending") && (
        <Section
          title="Trending in India"
          eyebrow="Top Charts"
          subtitle="What everyone is listening to across the country right now"
          status={sectionStatus}
          seeAllHref="/playlist/spotlight-trending"
          id="trending"
        >
          {trending.slice(0, RAIL_PREVIEW_LIMIT).map((song, i) => (
            <div key={songId(song) || i} className="relative w-40 shrink-0 sm:w-44 md:w-48">
              <SongCard
                song={song}
                queue={trending}
                index={i}
                onAddToPlaylist={setAddToPlaylistSong}
              />
            </div>
          ))}
        </Section>
      )}

      {/* ── Section: Interactive Regional Music Hub ── */}
      {(activeTab === "all" || activeTab === "regional") && regions.length > 0 && selectedRegionData && (
        <div className="space-y-4 rounded-3xl border border-white/[0.08] bg-[#0d0d0f]/80 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-meta font-extrabold text-amber-400 uppercase tracking-wider">Curated Collections</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">
                  {selectedRegionData.songs.length} Tracks
                </span>
              </div>
              <h2 className="text-h2 font-black text-white mt-1">Regional Spotlight</h2>
              <p className="text-caption text-white/50 mt-0.5">{selectedRegionData.subtitle}</p>
            </div>

            <Link
              to={`/playlist/spotlight-${selectedRegionData.slug}`}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
            >
              <span>Explore {selectedRegionData.label}</span>
              <IoChevronForward />
            </Link>
          </div>

          {/* Regional Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {regions.map((r) => (
              <button
                key={r.lang}
                type="button"
                onClick={() => setActiveRegion(r.lang)}
                className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-200 ${activeRegion === r.lang
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/25 scale-105"
                  : "border border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Active Regional Song Rail */}
          <div className="scrollbar-none flex gap-3.5 overflow-x-auto py-1 sm:gap-4">
            {selectedRegionData.songs.slice(0, RAIL_PREVIEW_LIMIT).map((song, i) => (
              <div key={songId(song) || i} className="w-40 shrink-0 sm:w-44 md:w-48">
                <SongCard
                  song={song}
                  queue={selectedRegionData.songs}
                  index={i}
                  onAddToPlaylist={setAddToPlaylistSong}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section: Albums & Soundtracks ── */}
      {(activeTab === "all" || activeTab === "fresh") && albumsData.length > 0 && (
        <Section title="Albums &amp; Soundtracks" eyebrow="Collections" subtitle="Browse by movie &amp; album" status="ready">
          {albumsData.slice(0, 16).map((album) => (
            <AlbumCard key={album._id || album.name} album={album} />
          ))}
        </Section>
      )}

      {/* ── Section: Smart Yearly Rewind Playlists ── */}
      {(activeTab === "all" || activeTab === "yearly") && yearlyPlaylists.length > 0 && (
        <Section
          title="Yearly Rewind"
          eyebrow="Smart Collections"
          subtitle="Smart playlists automatically aggregated by release year across catalog"
          status="ready"
          seeAllHref="/library/yearly"
          id="yearly-music"
        >
          {yearlyPlaylists.map((p) => (
            <div key={p.id} className="w-44 shrink-0 sm:w-48 md:w-52">
              <PlaylistCard playlist={p} />
            </div>
          ))}
        </Section>
      )}

      {/* ── Section: Jump Back In (Recently Played History) ── */}
      {(activeTab === "all" || activeTab === "fresh") && recentlyPlayed.length > 0 && (
        <Section
          title="Jump Back In"
          eyebrow="Recent"
          subtitle="Continue listening to tracks from your history"
          status="ready"
          seeAllHref="/library/recent"
        >
          {recentlyPlayed.slice(0, RAIL_PREVIEW_LIMIT).map((song, i) => (
            <div key={songId(song) || i} className="w-40 shrink-0 sm:w-44 md:w-48">
              <SongCard
                song={song}
                queue={recentlyPlayed}
                index={i}
                onAddToPlaylist={setAddToPlaylistSong}
              />
            </div>
          ))}
        </Section>
      )}

      {/* ── Section: Artists to Explore ── */}
      {(activeTab === "all" || activeTab === "artists") && displayArtists.length > 0 && (
        <Section
          title="Artists to Explore"
          eyebrow="Creators"
          subtitle="Explore top artists and their complete discographies"
          status="ready"
          seeAllHref="/library/artists"
          id="artists"
        >
          {displayArtists.map((artist) => (
            <ArtistCard key={artist.id || artist.name} artist={artist} />
          ))}
        </Section>
      )}

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        song={addToPlaylistSong}
        onClose={() => setAddToPlaylistSong(null)}
      />
    </div>
  );
};

export default Home;