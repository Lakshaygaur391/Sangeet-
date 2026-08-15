import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
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
    { label: "Late Night Drive", seed: 5 },
    { label: "Monsoon Moods", seed: 17 },
    { label: "Desi Hype", seed: 31 },
    { label: "Chill & Study", seed: 41 },
  ];

  const cardsFor = (list) => (song, i) => (
    <div key={`${song?._id}-${i}`} className="w-36 shrink-0 sm:w-40 md:w-44">
      <SongCard song={song} queue={list} index={i} onAddToPlaylist={setAddToPlaylistSong} />
    </div>
  );

  const sectionStatus = status === "loading" ? "loading" : status === "error" ? "error" : songs.length === 0 ? "empty" : "ready";

  const remaining = (list, visible) => Math.min(PAGE_SIZE, list.length - visible);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#141414] px-5 py-4">
        <p className="text-meta text-amber-300">Discover</p>
        <h1 className="text-display mt-1 text-white">Editorial picks, made for exploring</h1>
        <p className="text-body mt-1 text-white/45">Curated corners of Sangeet you won't find on the home feed.</p>
      </div>

      {/* â”€â”€ Today's Picks â”€â”€ */}
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

      {/* â”€â”€ Editor's Picks â”€â”€ */}
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

      {/* â”€â”€ Mood Grids (static 6-song snippets, no Load More needed) â”€â”€ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        {moods.map((mood) => {
          const list = seededShuffle(songs, mood.seed).slice(0, 6);
          return (
            <div key={mood.label} className="rounded-2xl border border-white/10 bg-[#141414] p-4">
              <p className="text-meta mb-2">Mood &amp; Moments</p>
              <h3 className="text-h3 mb-3 text-white">{mood.label}</h3>
              <div className="scrollbar-none flex gap-3 overflow-x-auto">
                {list.map((s, i) => (
                  <div key={`${s._id}-${i}`} className="w-24 shrink-0 sm:w-28">
                    <SongCard song={s} queue={list} index={i} onAddToPlaylist={setAddToPlaylistSong} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
