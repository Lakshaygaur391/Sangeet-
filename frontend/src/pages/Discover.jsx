import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import MoodCard from "../components/mood/MoodCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import songService, { getCachedDiscoverFeedSync } from "../services/songService";
import { normalizeSong } from "../lib/media";

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

const PAGE_SIZE = 24;

const Discover = () => {
  const cachedFeed = getCachedDiscoverFeedSync();
  const [feed, setFeed] = useState(cachedFeed || null);
  const [status, setStatus] = useState(cachedFeed ? "ready" : "loading");
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
      if (!getCachedDiscoverFeedSync()) {
        setStatus("loading");
      }
      const data = await songService.getDiscoverFeed();
      if (cancelled) return;
      if (!data) {
        if (!getCachedDiscoverFeedSync()) setStatus("error");
        return;
      }
      setFeed(data);
      setStatus("ready");
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Normalize sections from the feed for mood card pool
  const allSongs = useMemo(() => {
    if (!feed) return [];
    const raw = [
      ...(feed.todaysPicks || []),
      ...(feed.newVoices || []),
      ...(feed.ninetiesClassics || []),
      ...(feed.twothousandsHits || []),
      ...(feed.twentyTensHits || []),
      ...(feed.editorsPicks || []),
      ...(feed.hiddenGems || []),
      ...(feed.risingNow || []),
    ];
    const seen = new Set();
    const result = [];
    for (const s of raw) {
      const ns = normalizeSong(s);
      const key = (ns.audio_url || "").toLowerCase() || `${ns.title}::${ns.artist}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(ns);
    }
    return result;
  }, [feed]);

  const cardsFor = (list) => (song, i) => (
    <div key={`${song?._id || song?.audio_url}-${i}`} className="w-36 shrink-0 sm:w-40 md:w-44">
      <SongCard song={song} queue={list} index={i} onAddToPlaylist={setAddToPlaylistSong} />
    </div>
  );

  const sectionStatus = status === "loading" && !feed ? "loading" : status === "error" ? "error" : "ready";

  // Mood config (static, songs come from allSongs pool)
  const MOODS = [
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
      {feed?.todaysPicks && (
        <Section title="Today's Top Picks" eyebrow="Daily Refresh" status={sectionStatus} onRetry={() => window.location.reload()}>
          {stableShuffle(feed.todaysPicks, 11).slice(0, todaysVisible).map(cardsFor(feed.todaysPicks))}
        </Section>
      )}
      {sectionStatus === "ready" && feed?.todaysPicks && feed.todaysPicks.length > todaysVisible && (
        <LoadMoreButton
          onClick={() => setTodaysVisible((v) => v + PAGE_SIZE)}
          disabled={todaysVisible >= feed.todaysPicks.length}
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
          {MOODS.map((mood) => {
            const list = stableShuffle(allSongs, mood.seed).slice(0, 10);
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
      {feed?.newVoices && (
        <Section title="New Voices" eyebrow="Fresh &amp; Emerging Artists (2026/2025)" status={sectionStatus}>
          {stableShuffle(feed.newVoices, 83).slice(0, newVoicesVisible).map(cardsFor(feed.newVoices))}
        </Section>
      )}
      {sectionStatus === "ready" && feed?.newVoices && feed.newVoices.length > newVoicesVisible && (
        <LoadMoreButton
          onClick={() => setNewVoicesVisible((v) => v + PAGE_SIZE)}
          disabled={newVoicesVisible >= feed.newVoices.length}
          label="Load More New Voices"
        />
      )}

      {/* ── 4. 90s Evergreen Bollywood Spotlight (1990–2000) ── */}
      {feed?.ninetiesClassics?.length > 0 && (
        <div id="discover-90s">
          <Section
            title="90s Evergreen Bollywood"
            eyebrow="Golden Era Classics (1990–2000) · Kumar Sanu, Alka Yagnik, Udit Narayan"
            status="ready"
          >
            {stableShuffle(feed.ninetiesClassics, 91).slice(0, ninetiesVisible).map(cardsFor(feed.ninetiesClassics))}
          </Section>
          {ninetiesVisible < feed.ninetiesClassics.length && (
            <LoadMoreButton
              onClick={() => setNinetiesVisible((v) => v + PAGE_SIZE)}
              label="Load More 90s Classics"
            />
          )}
        </div>
      )}

      {/* ── 5. 2000s Golden Era Bollywood (2000–2010) ── */}
      {feed?.twothousandsHits?.length > 0 && (
        <div id="discover-2000s">
          <Section
            title="2000s Golden Era Bollywood"
            eyebrow="Melodies of 2000–2010 · KK, Shaan, Mohit Chauhan, Emraan Hashmi Hits"
            status="ready"
          >
            {stableShuffle(feed.twothousandsHits, 2003).slice(0, twothousandsVisible).map(cardsFor(feed.twothousandsHits))}
          </Section>
          {twothousandsVisible < feed.twothousandsHits.length && (
            <LoadMoreButton
              onClick={() => setTwothousandsVisible((v) => v + PAGE_SIZE)}
              label="Load More 2000s Hits"
            />
          )}
        </div>
      )}

      {/* ── 6. 2010s Blockbuster Anthems (2010–2020) ── */}
      {feed?.twentyTensHits?.length > 0 && (
        <div id="discover-2010s">
          <Section
            title="2010s Era Blockbusters"
            eyebrow="Decade Anthems (2010–2020) · Arijit Singh, Badshah, Pritam"
            status="ready"
          >
            {stableShuffle(feed.twentyTensHits, 2015).slice(0, twentyTensVisible).map(cardsFor(feed.twentyTensHits))}
          </Section>
          {twentyTensVisible < feed.twentyTensHits.length && (
            <LoadMoreButton
              onClick={() => setTwentyTensVisible((v) => v + PAGE_SIZE)}
              label="Load More 2010s Anthems"
            />
          )}
        </div>
      )}

      {/* ── 7. Editor's Picks ── */}
      {feed?.editorsPicks?.length > 0 && (
        <Section title="Editor's Picks" eyebrow="Chartbusters &amp; Superstars" status={sectionStatus}>
          {stableShuffle(feed.editorsPicks, 19).slice(0, editorsVisible).map(cardsFor(feed.editorsPicks))}
        </Section>
      )}
      {sectionStatus === "ready" && feed?.editorsPicks?.length > editorsVisible && (
        <LoadMoreButton
          onClick={() => setEditorsVisible((v) => v + PAGE_SIZE)}
          disabled={editorsVisible >= feed.editorsPicks.length}
          label="Load More Picks"
        />
      )}

      {/* ── 8. Hidden Gems ── */}
      {feed?.hiddenGems && (
        <Section title="Hidden Gems" eyebrow="Indie &amp; Unplugged" status={sectionStatus}>
          {stableShuffle(feed.hiddenGems, 47).slice(0, gemsVisible).map(cardsFor(feed.hiddenGems))}
        </Section>
      )}
      {sectionStatus === "ready" && feed?.hiddenGems && feed.hiddenGems.length > gemsVisible && (
        <LoadMoreButton
          onClick={() => setGemsVisible((v) => v + PAGE_SIZE)}
          disabled={gemsVisible >= feed.hiddenGems.length}
          label="Load More Gems"
        />
      )}

      {/* ── 9. Recently Rising ── */}
      {feed?.risingNow?.length > 0 && (
        <Section title="Recently Rising" eyebrow="Viral Trends" status={sectionStatus}>
          {stableShuffle(feed.risingNow, 29).slice(0, risingVisible).map(cardsFor(feed.risingNow))}
        </Section>
      )}
      {sectionStatus === "ready" && feed?.risingNow?.length > risingVisible && (
        <LoadMoreButton
          onClick={() => setRisingVisible((v) => v + PAGE_SIZE)}
          disabled={risingVisible >= feed.risingNow.length}
          label="Load More Rising Tracks"
        />
      )}

      <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />
    </div>
  );
};

export default Discover;
