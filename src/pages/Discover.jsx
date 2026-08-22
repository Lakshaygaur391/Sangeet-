import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import MoodCard from "../components/mood/MoodCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { usePlayer } from "../context/PlayerContext";
import songService from "../services/songService";
import { normalizeSong } from "../lib/media";

// Seeded shuffle so "random" editorial groupings stay stable across a render
// pass instead of re-shuffling on every keystroke/interaction.
function seededShuffle(list, seed) {
  const arr = [...list];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const PAGE_SIZE = 50; // songs revealed per Load More click

const Discover = () => {
  const [status, setStatus] = useState("loading");
  const [rawSongs, setRawSongs] = useState([]);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  // Per-section visible counts
  const [todaysVisible, setTodaysVisible] = useState(PAGE_SIZE);
  const [editorsVisible, setEditorsVisible] = useState(PAGE_SIZE);
  const [newVoicesVisible, setNewVoicesVisible] = useState(PAGE_SIZE);
  const [gemsVisible, setGemsVisible] = useState(PAGE_SIZE);
  const [risingVisible, setRisingVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      const fetchedSongs = await songService.getAll();
      if (cancelled) return;
      if (fetchedSongs === null) return setStatus("error");
      setRawSongs(fetchedSongs);
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Full shuffled lists â€” sliced by visible state below
  const todaysPicks = useMemo(() => seededShuffle(songs, 11), [songs]);
  const hiddenGems = useMemo(() => seededShuffle(songs, 47), [songs]);
  const newVoices = useMemo(() => seededShuffle(songs, 83), [songs]);
  const editorsPicks = useMemo(() => seededShuffle(songs, 19), [songs]);
  const risingNow = useMemo(() => seededShuffle(songs, 29), [songs]);

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
    <div key={`${song?._id}-${i}`} className="w-44 shrink-0 sm:w-48 md:w-52">
      <SongCard song={song} queue={list} index={i} onAddToPlaylist={setAddToPlaylistSong} />
    </div>
  );

  const sectionStatus = status === "loading" ? "loading" : status === "error" ? "error" : songs.length === 0 ? "empty" : "ready";

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
          <h1 className="text-display mt-2 font-black text-white">Editorial picks, made for exploring</h1>
          <p className="text-body mt-2 max-w-2xl text-white/60">
            Curated corners, mood mixes, and hand-picked gems you won't find on the regular feed.
          </p>
        </div>
      </div>

      {/* ── Today's Picks ── */}
      <Section title="Today's Picks" status={sectionStatus} onRetry={() => window.location.reload()}>
        {todaysPicks.slice(0, todaysVisible).map(cardsFor(todaysPicks))}
      </Section>
      {sectionStatus === "ready" && (
        <LoadMoreButton
          onClick={() => setTodaysVisible((v) => v + PAGE_SIZE)}
          disabled={todaysVisible >= todaysPicks.length}
          label="Load More"
        />
      )}

      {/* ── Editor's Picks ── */}
      <Section title="Editor's Picks" eyebrow="Hand-picked" status={sectionStatus}>
        {editorsPicks.slice(0, editorsVisible).map(cardsFor(editorsPicks))}
      </Section>
      {sectionStatus === "ready" && (
        <LoadMoreButton
          onClick={() => setEditorsVisible((v) => v + PAGE_SIZE)}
          disabled={editorsVisible >= editorsPicks.length}
          label="Load More"
        />
      )}

      {/* ── Mood & Moments (Redesigned Atmospheric Mood Cards) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-meta font-bold text-amber-400">Atmospheric Soundtracks</p>
            <h2 className="text-h2 font-black text-white">Moods &amp; Moments</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {moods.map((mood) => {
            const list = seededShuffle(songs, mood.seed).slice(0, 10);
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

      {/* â”€â”€ New Voices â”€â”€ */}
      <Section title="New Voices" eyebrow="Emerging artists" status={sectionStatus}>
        {newVoices.slice(0, newVoicesVisible).map(cardsFor(newVoices))}
      </Section>
      {sectionStatus === "ready" && (
        <LoadMoreButton
          onClick={() => setNewVoicesVisible((v) => v + PAGE_SIZE)}
          disabled={newVoicesVisible >= newVoices.length}
          label="Load More"
        />
      )}

      {/* â”€â”€ Hidden Gems â”€â”€ */}
      <Section title="Hidden Gems" eyebrow="Underrated" status={sectionStatus}>
        {hiddenGems.slice(0, gemsVisible).map(cardsFor(hiddenGems))}
      </Section>
      {sectionStatus === "ready" && (
        <LoadMoreButton
          onClick={() => setGemsVisible((v) => v + PAGE_SIZE)}
          disabled={gemsVisible >= hiddenGems.length}
          label="Load More"
        />
      )}

      {/* â”€â”€ Recently Rising â”€â”€ */}
      <Section title="Recently Rising" eyebrow="Gaining momentum" status={sectionStatus}>
        {risingNow.slice(0, risingVisible).map(cardsFor(risingNow))}
      </Section>
      {sectionStatus === "ready" && (
        <LoadMoreButton
          onClick={() => setRisingVisible((v) => v + PAGE_SIZE)}
          disabled={risingVisible >= risingNow.length}
          label="Load More"
        />
      )}

      <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />
    </div>
  );
};

export default Discover;
