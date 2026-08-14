import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
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

const Discover = () => {
  const { songList, setSongList } = usePlayer();
  const [status, setStatus] = useState("loading");
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (songList.length > 0) {
        setStatus("ready");
        return;
      }
      setStatus("loading");
      const songs = await songService.getAll();
      if (cancelled) return;
      if (songs === null) return setStatus("error");
      setSongList(songs);
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const songs = useMemo(() => songList.map(normalizeSong), [songList]);

  const todaysPicks = useMemo(() => seededShuffle(songs, 11).slice(0, 12), [songs]);
  const hiddenGems = useMemo(() => seededShuffle(songs, 47).slice(0, 12), [songs]);
  const newVoices = useMemo(() => seededShuffle(songs, 83).slice(0, 12), [songs]);
  const editorsPicks = useMemo(() => seededShuffle(songs, 19).slice(0, 12), [songs]);
  const risingNow = useMemo(() => seededShuffle(songs, 29).slice(0, 12), [songs]);

  const moods = [
    { label: "Late Night Drive", seed: 5 },
    { label: "Monsoon Moods", seed: 17 },
    { label: "Desi Hype", seed: 31 },
    { label: "Chill & Study", seed: 41 },
  ];

  const cardsFor = (list) => (i) => (
    <div key={`${list[i]?._id}-${i}`} className="w-36 shrink-0 sm:w-40 md:w-44">
      <SongCard song={list[i]} queue={list} index={i} onAddToPlaylist={setAddToPlaylistSong} />
    </div>
  );

  const sectionStatus = status === "loading" ? "loading" : status === "error" ? "error" : songs.length === 0 ? "empty" : "ready";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#141414] px-5 py-4">
        <p className="text-meta text-amber-300">Discover</p>
        <h1 className="text-display mt-1 text-white">Editorial picks, made for exploring</h1>
        <p className="text-body mt-1 text-white/45">Curated corners of Sangeet you won't find on the home feed.</p>
      </div>

      <Section title="Today's Picks" status={sectionStatus} onRetry={() => window.location.reload()}>
        {todaysPicks.map((_, i) => cardsFor(todaysPicks)(i))}
      </Section>

      <Section title="Editor's Picks" eyebrow="Hand-picked" status={sectionStatus}>
        {editorsPicks.map((_, i) => cardsFor(editorsPicks)(i))}
      </Section>

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

      <Section title="New Voices" eyebrow="Emerging artists" status={sectionStatus}>
        {newVoices.map((_, i) => cardsFor(newVoices)(i))}
      </Section>

      <Section title="Hidden Gems" eyebrow="Underrated" status={sectionStatus}>
        {hiddenGems.map((_, i) => cardsFor(hiddenGems)(i))}
      </Section>

      <Section title="Recently Rising" eyebrow="Gaining momentum" status={sectionStatus}>
        {risingNow.map((_, i) => cardsFor(risingNow)(i))}
      </Section>

      <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />
    </div>
  );
};

export default Discover;
