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
import songService from "../services/songService";
import artistService from "../services/artistService";
import { normalizeSong, songId } from "../lib/media";

const GREETINGS = ["Welcome back", "Good to see you", "Ready to listen", "Turn up the volume"];
const RAIL_PREVIEW_LIMIT = 15;

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

const Home = () => {
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, setIsPlaying } = usePlayer();
  const { recentlyPlayed, yearlyPlaylists } = useLibrary();
  const { user, isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const [status, setStatus] = useState("loading");
  const [rawSongs, setRawSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [activeRegion, setActiveRegion] = useState("Bollywood");
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  const greeting = useMemo(() => GREETINGS[new Date().getDate() % GREETINGS.length], []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      const [fetchedSongs, fetchedArtists] = await Promise.all([
        songService.getAll(),
        artistService.getAll(),
      ]);
      if (cancelled) return;
      if (fetchedSongs === null) {
        setStatus("error");
        return;
      }
      setRawSongs(fetchedSongs);
      if (Array.isArray(fetchedArtists) && fetchedArtists.length > 0) {
        setArtists(fetchedArtists);
      }
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deduplicated catalog
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

  // Regional language spotlights list
  const regions = useMemo(() => {
    const list = [
      "Bollywood",
      "Punjabi",
      "Hindi",
      "Haryanvi",
      "Instagram viral song",
      "Indipop",
      "Bhojpuri",
      "Tamil",
      "Telugu",
      "Malayalam",
      "Kannada",
      "Marathi",
      "English",
    ];

    return list
      .map((lang) => ({
        lang,
        label: lang === "Instagram viral song" ? "Viral Hits" : lang,
        subtitle: SPOTLIGHT_SUBTITLES[lang] || `Latest ${lang} tracks`,
        slug: lang.toLowerCase().replace(/\s+/g, "-"),
        songs: byLanguage(lang),
      }))
      .filter((r) => r.songs.length > 0);
  }, [byLanguage]);

  // Set default active region if current selection is empty
  useEffect(() => {
    if (regions.length > 0 && !regions.some((r) => r.lang === activeRegion)) {
      setActiveRegion(regions[0].lang);
    }
  }, [regions, activeRegion]);

  const selectedRegionData = useMemo(() => {
    return regions.find((r) => r.lang === activeRegion) || regions[0] || null;
  }, [regions, activeRegion]);

  // Spotify-style 6 Quick Launch cards
  const quickMixCards = useMemo(() => {
    if (!songs.length) return [];
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

    const bollywood = byLanguage("Bollywood");
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
      const fallbackImg = songs.find((s) => s.year === "2026" || s.year === 2026)?.thumbnail_url || songs[3]?.thumbnail_url || songs[0]?.thumbnail_url;
      items.push({
        title: `${yp.name || "2026"} Rewind`,
        subtitle: `${ySongs.length || 20} top songs`,
        image: yp.thumbnail_url || yp.coverImage || ySongs[0]?.thumbnail_url || fallbackImg,
        songs: ySongs.length > 0 ? ySongs : songs.slice(0, 20),
        href: `/playlist/${yp.id || yp._id || "yearly"}`,
      });
    } else if (songs.length > 0) {
      const fallbackImg = songs.find((s) => s.year === "2026" || s.year === 2026)?.thumbnail_url || songs[3]?.thumbnail_url || songs[0]?.thumbnail_url;
      items.push({
        title: "2026 Rewind",
        subtitle: "Top chart songs",
        image: fallbackImg,
        songs: songs.slice(0, 20),
        href: "/library",
      });
    }

    return items.slice(0, 6);
  }, [songs, recentlyPlayed, byLanguage, trending, yearlyPlaylists]);

  const displayArtists = useMemo(() => {
    if (artists.length > 0) {
      return artists.slice(0, 18);
    }
    const map = new Map();
    for (const s of songs) {
      const raw = (s.artist || "").trim();
      if (!raw || raw === "Unknown Artist") continue;
      const key = raw.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: raw,
          id: raw,
          image: s.thumbnail_url || "",
          thumbnail_url: s.thumbnail_url || "",
          songs: [s],
          songCount: 1,
          verified: true,
        });
      } else {
        const item = map.get(key);
        item.songs.push(s);
        item.songCount = item.songs.length;
      }
    }
    return Array.from(map.values()).slice(0, 18);
  }, [artists, songs]);

  const sectionStatus =
    status === "loading"
      ? "loading"
      : status === "error"
      ? "error"
      : songs.length === 0
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
              <h1 className="text-display mt-1 font-black text-white">Find your next favourite track</h1>
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
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                activeTab === t.key
                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/25 scale-105"
                  : "border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Spotify-Style 6-Pack Quick Play Grid (Visible on All / Mixes) ── */}
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
                    playSong(featured, songs, 0);
                  }}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 px-7 py-3 text-sm font-black text-black shadow-lg shadow-amber-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <IoPlay className="translate-x-0.5 text-lg" />
                  <span>Listen Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const shuffled = [...songs].sort(() => 0.5 - Math.random());
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
          subtitle="New music and freshly added drops picked for you"
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
              {/* Rank badge */}
              <div className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-lg bg-black/80 font-black text-xs text-amber-300 border border-amber-400/30 backdrop-blur-md shadow-md">
                {i + 1}
              </div>
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

      {/* ── Section: Interactive Regional Music Hub (ORGANIZED & SLEEK) ── */}
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
                className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  activeRegion === r.lang
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