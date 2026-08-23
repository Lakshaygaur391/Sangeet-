import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import MoodCard from "../components/mood/MoodCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import songService, { getCachedCatalogSync } from "../services/songService";
import { normalizeSong, getSongDecade } from "../lib/media";

// Seeded shuffle helper to keep stable order per session
function stableShuffle(list, seed = 42) {
  const arr = [...list];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const MAINSTREAM_ARTISTS = new Set([
  "arijit singh", "diljit dosanjh", "badshah", "shreya ghoshal",
  "neha kakkar", "guru randhawa", "ap dhillon", "yo yo honey singh",
  "karan aujla", "sidhu moose wala", "b praak", "pritam", "atif aslam"
]);

const PAGE_SIZE = 24;

const Discover = () => {
  const cached = getCachedCatalogSync();
  const [rawSongs, setRawSongs] = useState(cached || []);
  const [status, setStatus] = useState(cached && cached.length > 0 ? "ready" : "loading");
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  // Per-section visible counts
  const [todaysVisible, setTodaysVisible] = useState(PAGE_SIZE);
  const [newVoicesVisible, setNewVoicesVisible] = useState(PAGE_SIZE);
  const [ninetiesVisible, setNinetiesVisible] = useState(PAGE_SIZE);
  const [twothousandsVisible, setTwothousandsVisible] = useState(PAGE_SIZE);
  const [twentyTensVisible, setTwentyTensVisible] = useState(PAGE_SIZE);
  const [editorsVisible, setEditorsVisible] = useState(PAGE_SIZE);
  const [gemsVisible, setGemsVisible] = useState(PAGE_SIZE);
  const [risingVisible, setRisingVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getCachedCatalogSync()) {
        setStatus("loading");
      }
      const fetchedSongs = await songService.getAll();
      if (cancelled) return;
      if (fetchedSongs === null && !getCachedCatalogSync()) {
        setStatus("error");
        return;
      }
      if (fetchedSongs) {
        setRawSongs(fetchedSongs);
      }
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deduplicated base catalog
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

  // ── 1. Today's Top Picks: Latest 2026/2025 trending releases
  const todaysPicks = useMemo(() => {
    const latest = songs.filter((s) => {
      const yr = s.year || s._year || "";
      return yr === "2026" || yr === "2025" || (!yr && s.id > 50000);
    });
    return latest.length > 20 ? stableShuffle(latest, 11) : stableShuffle(songs.slice(0, 200), 11);
  }, [songs]);

  // ── 2. New Voices: 2026/2025 tracks from indie and emerging breakthrough voices
  const newVoices = useMemo(() => {
    const emerging = songs.filter((s) => {
      const yr = s.year || s._year || "";
      const art = (s.artist || "").toLowerCase().trim();
      const isRecent = yr === "2026" || yr === "2025" || yr === "2024";
      const isIndieOrNonMainstream = !MAINSTREAM_ARTISTS.has(art);
      return isRecent && isIndieOrNonMainstream;
    });
    return emerging.length > 10 ? stableShuffle(emerging, 83) : songs.filter((s) => s.year === "2026");
  }, [songs]);

  // ── 3. 90s Evergreen Bollywood Spotlight (1990–2000)
  const ninetiesClassics = useMemo(() => {
    const list = songs.filter((s) => {
      const decade = getSongDecade(s);
      const lang = (s.language || "").toLowerCase();
      return decade === "90s" && (lang === "bollywood" || lang === "hindi" || !lang);
    });
    return stableShuffle(list.length > 0 ? list : songs.slice(500, 800), 91);
  }, [songs]);

  // ── 4. 2000s Golden Era Bollywood Spotlight (2000–2010)
  const twothousandsHits = useMemo(() => {
    const list = songs.filter((s) => {
      const decade = getSongDecade(s);
      const lang = (s.language || "").toLowerCase();
      return decade === "2000s" && (lang === "bollywood" || lang === "hindi" || !lang);
    });
    return stableShuffle(list.length > 0 ? list : songs.slice(300, 500), 2003);
  }, [songs]);

  // ── 5. 2010s Blockbuster Anthems (2010–2020)
  const twentyTensHits = useMemo(() => {
    const list = songs.filter((s) => {
      const decade = getSongDecade(s);
      return decade === "2010s";
    });
    return stableShuffle(list.length > 0 ? list : songs.slice(100, 300), 2015);
  }, [songs]);

  // ── 6. Editor's Choice: Superstar Chartbusters
  const editorsPicks = useMemo(() => {
    const superstarHits = songs.filter((s) => {
      const art = (s.artist || "").toLowerCase();
      return Array.from(MAINSTREAM_ARTISTS).some((name) => art.includes(name));
    });
    return superstarHits.length > 20 ? stableShuffle(superstarHits, 19) : stableShuffle(songs, 19);
  }, [songs]);

  // ── 7. Hidden Gems: Soulful Indipop & Acoustic Singles
  const hiddenGems = useMemo(() => {
    const indieGems = songs.filter((s) => {
      const lang = (s.language || "").toLowerCase();
      const alb = (s.album || "").toLowerCase();
      return lang.includes("indipop") || alb.includes("single") || s.title.toLowerCase().includes("acoustic");
    });
    return indieGems.length > 15 ? stableShuffle(indieGems, 47) : stableShuffle(songs.slice(100, 300), 47);
  }, [songs]);

  // ── 8. Recently Rising & Viral Hits
  const risingNow = useMemo(() => {
    const viral = songs.filter((s) => {
      const lang = (s.language || "").toLowerCase();
      const title = (s.title || "").toLowerCase();
      return lang.includes("punjabi") || lang.includes("haryanvi") || lang.includes("viral") || title.includes("remix");
    });
    return viral.length > 20 ? stableShuffle(viral, 29) : stableShuffle(songs, 29);
  }, [songs]);

  // ── Atmospheric Moods Configuration
  const moods = [
    {
      label: "Late Night Drive",
      description: "Neon highways, atmospheric lo-fi & late-night cruising rhythms",
      seed: 5,
      borderClass: "border-indigo-500/25 hover:border-indigo-400/45",
      bgClass: "bg-gradient-to-br from-[#121024] via-[#0d0d12] to-[#08080a]",
      glowClass: "bg-indigo-600/25",
      accentTextClass: "text-indigo-400",
      playBtnClass: "bg-gradient-to-br from-indigo-400 to-indigo-600 hover:from-indigo-300 hover:to-indigo-500",
    },
    {
      label: "Monsoon Moods",
      description: "Soulful acoustic melodies, raindrops & cozy chai-time classics",
      seed: 17,
      borderClass: "border-teal-500/25 hover:border-teal-400/45",
      bgClass: "bg-gradient-to-br from-[#0c1c1a] via-[#0b1112] to-[#08080a]",
      glowClass: "bg-teal-500/25",
      accentTextClass: "text-teal-300",
      playBtnClass: "bg-gradient-to-br from-teal-300 to-emerald-500 hover:from-teal-200 hover:to-emerald-400",
    },
    {
      label: "Desi Hype",
      description: "High-octane Punjabi bhangra, hip-hop & bass-boosted party anthems",
      seed: 31,
      borderClass: "border-rose-500/25 hover:border-rose-400/45",
      bgClass: "bg-gradient-to-br from-[#200e14] via-[#120b0d] to-[#08080a]",
      glowClass: "bg-rose-600/25",
      accentTextClass: "text-rose-400",
      playBtnClass: "bg-gradient-to-br from-rose-400 to-amber-500 hover:from-rose-300 hover:to-amber-400",
    },
    {
      label: "Chill & Study",
      description: "Focus flow, relaxing acoustic strings & soothing ambient instrumentals",
      seed: 41,
      borderClass: "border-amber-500/25 hover:border-amber-400/45",
      bgClass: "bg-gradient-to-br from-[#1e170c] via-[#12100d] to-[#08080a]",
      glowClass: "bg-amber-500/25",
      accentTextClass: "text-amber-300",
      playBtnClass: "bg-gradient-to-br from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400",
    },
  ];

  const cardsFor = (list) => (song, i) => (
    <div key={`${song?._id || song?.audio_url}-${i}`} className="w-36 shrink-0 sm:w-40 md:w-44">
      <SongCard song={song} queue={list} index={i} onAddToPlaylist={setAddToPlaylistSong} />
    </div>
  );

  const sectionStatus =
    status === "loading"
      ? "loading"
      : status === "error"
      ? "error"
      : songs.length === 0
      ? "empty"
      : "ready";

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Editorial Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1c1a14] via-[#121214] to-[#0a0a0c] p-6 shadow-2xl md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-meta font-extrabold tracking-widest text-amber-300">DISCOVER SANGEET</p>
          </div>
          <h1 className="text-display mt-2 font-black text-white text-3xl sm:text-4xl md:text-5xl">
            Curated Collections &amp; Eras
          </h1>
          <p className="text-body mt-2 max-w-2xl text-white/60">
            Curated corners, mood mixes, 90s &amp; 2000s classics, and hand-picked gems crafted for you.
          </p>
        </div>
      </div>

      {/* ── 1. Today's Picks ── */}
      <Section title="Today's Top Picks" eyebrow="Daily Refresh" status={sectionStatus} onRetry={() => window.location.reload()}>
        {todaysPicks.slice(0, todaysVisible).map(cardsFor(todaysPicks))}
      </Section>
      {sectionStatus === "ready" && todaysPicks.length > todaysVisible && (
        <LoadMoreButton
          onClick={() => setTodaysVisible((v) => v + PAGE_SIZE)}
          disabled={todaysVisible >= todaysPicks.length}
          label="Load More Picks"
        />
      )}

      {/* ── 2. Mood & Moments (Atmospheric Soundtracks) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-meta font-bold text-amber-400">Atmospheric Soundtracks</p>
            <h2 className="text-h2 font-black text-white">Moods &amp; Moments</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {moods.map((mood) => {
            const list = stableShuffle(songs, mood.seed).slice(0, 10);
            return (
              <MoodCard
                key={mood.label}
                mood={mood}
                songs={list}
                onAddToPlaylist={setAddToPlaylistSong}
              />
            );
          })}
        </div>
      </div>

      {/* ── 3. New Voices & Breakthrough Releases ── */}
      <Section title="New Voices" eyebrow="Fresh &amp; Emerging Artists (2026/2025)" status={sectionStatus}>
        {newVoices.slice(0, newVoicesVisible).map(cardsFor(newVoices))}
      </Section>
      {sectionStatus === "ready" && newVoices.length > newVoicesVisible && (
        <LoadMoreButton
          onClick={() => setNewVoicesVisible((v) => v + PAGE_SIZE)}
          disabled={newVoicesVisible >= newVoices.length}
          label="Load More New Voices"
        />
      )}

      {/* ── 4. 90s Evergreen Bollywood Spotlight (1990–2000) ── */}
      {ninetiesClassics.length > 0 && (
        <div id="discover-90s">
          <Section
            title="90s Evergreen Bollywood"
            eyebrow="Golden Era Classics (1990–2000) · Kumar Sanu, Alka Yagnik, Udit Narayan"
            status="ready"
          >
            {ninetiesClassics.slice(0, ninetiesVisible).map(cardsFor(ninetiesClassics))}
          </Section>
          {ninetiesVisible < ninetiesClassics.length && (
            <LoadMoreButton
              onClick={() => setNinetiesVisible((v) => v + PAGE_SIZE)}
              label="Load More 90s Classics"
            />
          )}
        </div>
      )}

      {/* ── 5. 2000s Golden Era Bollywood (2000–2010) ── */}
      {twothousandsHits.length > 0 && (
        <div id="discover-2000s">
          <Section
            title="2000s Golden Era Bollywood"
            eyebrow="Melodies of 2000–2010 · KK, Shaan, Mohit Chauhan, Emraan Hashmi Hits"
            status="ready"
          >
            {twothousandsHits.slice(0, twothousandsVisible).map(cardsFor(twothousandsHits))}
          </Section>
          {twothousandsVisible < twothousandsHits.length && (
            <LoadMoreButton
              onClick={() => setTwothousandsVisible((v) => v + PAGE_SIZE)}
              label="Load More 2000s Hits"
            />
          )}
        </div>
      )}

      {/* ── 6. 2010s Blockbuster Anthems (2010–2020) ── */}
      {twentyTensHits.length > 0 && (
        <div id="discover-2010s">
          <Section
            title="2010s Era Blockbusters"
            eyebrow="Decade Anthems (2010–2020) · Arijit Singh, Badshah, Pritam"
            status="ready"
          >
            {twentyTensHits.slice(0, twentyTensVisible).map(cardsFor(twentyTensHits))}
          </Section>
          {twentyTensVisible < twentyTensHits.length && (
            <LoadMoreButton
              onClick={() => setTwentyTensVisible((v) => v + PAGE_SIZE)}
              label="Load More 2010s Anthems"
            />
          )}
        </div>
      )}

      {/* ── 7. Editor's Picks ── */}
      <Section title="Editor's Picks" eyebrow="Chartbusters &amp; Superstars" status={sectionStatus}>
        {editorsPicks.slice(0, editorsVisible).map(cardsFor(editorsPicks))}
      </Section>
      {sectionStatus === "ready" && editorsPicks.length > editorsVisible && (
        <LoadMoreButton
          onClick={() => setEditorsVisible((v) => v + PAGE_SIZE)}
          disabled={editorsVisible >= editorsPicks.length}
          label="Load More Picks"
        />
      )}

      {/* ── 8. Hidden Gems ── */}
      <Section title="Hidden Gems" eyebrow="Indie &amp; Unplugged" status={sectionStatus}>
        {hiddenGems.slice(0, gemsVisible).map(cardsFor(hiddenGems))}
      </Section>
      {sectionStatus === "ready" && hiddenGems.length > gemsVisible && (
        <LoadMoreButton
          onClick={() => setGemsVisible((v) => v + PAGE_SIZE)}
          disabled={gemsVisible >= hiddenGems.length}
          label="Load More Gems"
        />
      )}

      {/* ── 9. Recently Rising ── */}
      <Section title="Recently Rising" eyebrow="Viral Trends" status={sectionStatus}>
        {risingNow.slice(0, risingVisible).map(cardsFor(risingNow))}
      </Section>
      {sectionStatus === "ready" && risingNow.length > risingVisible && (
        <LoadMoreButton
          onClick={() => setRisingVisible((v) => v + PAGE_SIZE)}
          disabled={risingVisible >= risingNow.length}
          label="Load More Rising Tracks"
        />
      )}

      <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />
    </div>
  );
};

export default Discover;
