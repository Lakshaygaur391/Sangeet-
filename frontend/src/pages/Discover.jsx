import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import LoadMoreButton from "../components/ui/LoadMoreButton";
import { usePlayer } from "../context/PlayerContext";
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

const PAGE_SIZE = 50;

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

  // ── Mood Collections
  const lateNightDrive = useMemo(() => {
    const slow = songs.filter((s) => {
      const t = (s.title || "").toLowerCase();
      const a = (s.artist || "").toLowerCase();
      return t.includes("dil") || t.includes("ishq") || t.includes("yaad") || a.includes("arijit") || a.includes("atif") || a.includes("jasleen");
    });
    return stableShuffle(slow.length > 6 ? slow : songs, 5).slice(0, 8);
  }, [songs]);

  const desiHype = useMemo(() => {
    const hype = songs.filter((s) => {
      const lang = (s.language || "").toLowerCase();
      return lang.includes("punjabi") || lang.includes("haryanvi");
    });
    return stableShuffle(hype.length > 6 ? hype : songs, 31).slice(0, 8);
  }, [songs]);

  const monsoonMelodies = useMemo(() => {
    const romantic = songs.filter((s) => {
      const t = (s.title || "").toLowerCase();
      return t.includes("baarish") || t.includes("barsaat") || t.includes("pyaar") || t.includes("tere") || t.includes("tum");
    });
    return stableShuffle(romantic.length > 6 ? romantic : songs, 17).slice(0, 8);
  }, [songs]);

  const chillVibes = useMemo(() => {
    const chill = songs.filter((s) => {
      const lang = (s.language || "").toLowerCase();
      return lang.includes("indipop") || lang.includes("english") || s.title.toLowerCase().includes("instrumental");
    });
    return stableShuffle(chill.length > 6 ? chill : songs, 41).slice(0, 8);
  }, [songs]);

  const cardsFor = (list) => (song, i) => (
    <div key={`${song?._id || song?.audio_url}-${i}`} className="w-36 shrink-0 sm:w-40 md:w-44">
      <SongCard song={song} queue={list} index={i} onAddToPlaylist={setAddToPlaylistSong} />
    </div>
  );

  const sectionStatus = status === "loading" ? "loading" : status === "error" ? "error" : songs.length === 0 ? "empty" : "ready";

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-[#141414] px-5 py-4">
        <p className="text-meta text-amber-300">Discover Music</p>
        <h1 className="text-display mt-1 text-white">Curated Collections, Eras &amp; New Waves</h1>
        <p className="text-body mt-1 text-white/45">Explore fresh voices, 90s nostalgia, 2000s classics, and mood-crafted soundtracks.</p>
      </div>

      {/* ── 1. Today's Top Picks ── */}
      <Section title="Today's Top Picks" eyebrow="Daily Refresh" status={sectionStatus} onRetry={() => window.location.reload()}>
        {todaysPicks.slice(0, todaysVisible).map(cardsFor(todaysPicks))}
      </Section>
      {sectionStatus === "ready" && todaysPicks.length > todaysVisible && (
        <LoadMoreButton
          onClick={() => setTodaysVisible((v) => v + PAGE_SIZE)}
          disabled={todaysVisible >= todaysPicks.length}
          label="Load More"
        />
      )}

      {/* ── 2. New Voices & Breakthrough Releases ── */}
      <Section title="New Voices" eyebrow="Fresh &amp; Emerging Artists (2026/2025)" status={sectionStatus}>
        {newVoices.slice(0, newVoicesVisible).map(cardsFor(newVoices))}
      </Section>
      {sectionStatus === "ready" && newVoices.length > newVoicesVisible && (
        <LoadMoreButton
          onClick={() => setNewVoicesVisible((v) => v + PAGE_SIZE)}
          disabled={newVoicesVisible >= newVoices.length}
          label="Load More"
        />
      )}

      {/* ── 3. 90s Evergreen Bollywood Spotlight (1990–2000) ── */}
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

      {/* ── 4. 2000s Golden Era Bollywood (2000–2010) ── */}
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

      {/* ── 5. 2010s Blockbuster Anthems (2010–2020) ── */}
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

      {/* ── 6. Mood & Moments Grids ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
        {/* Late Night Drive */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
          <p className="text-meta text-amber-300/80 mb-1">Mood &amp; Moments</p>
          <h3 className="text-h3 mb-3 text-white">Late Night Drive</h3>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {lateNightDrive.map((s, i) => (
              <div key={`lnd-${s._id || i}`} className="w-28 shrink-0 sm:w-32">
                <SongCard song={s} queue={lateNightDrive} index={i} onAddToPlaylist={setAddToPlaylistSong} />
              </div>
            ))}
          </div>
        </div>

        {/* Desi Hype */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
          <p className="text-meta text-amber-300/80 mb-1">Party &amp; Workout</p>
          <h3 className="text-h3 mb-3 text-white">Desi Hype Bangerz</h3>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {desiHype.map((s, i) => (
              <div key={`dh-${s._id || i}`} className="w-28 shrink-0 sm:w-32">
                <SongCard song={s} queue={desiHype} index={i} onAddToPlaylist={setAddToPlaylistSong} />
              </div>
            ))}
          </div>
        </div>

        {/* Monsoon Melodies */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
          <p className="text-meta text-amber-300/80 mb-1">Melodic Romance</p>
          <h3 className="text-h3 mb-3 text-white">Monsoon &amp; Rain Melodies</h3>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {monsoonMelodies.map((s, i) => (
              <div key={`mm-${s._id || i}`} className="w-28 shrink-0 sm:w-32">
                <SongCard song={s} queue={monsoonMelodies} index={i} onAddToPlaylist={setAddToPlaylistSong} />
              </div>
            ))}
          </div>
        </div>

        {/* Chill & Focus */}
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
          <p className="text-meta text-amber-300/80 mb-1">Relax &amp; Lo-Fi</p>
          <h3 className="text-h3 mb-3 text-white">Chill &amp; Focus Vibes</h3>
          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {chillVibes.map((s, i) => (
              <div key={`cv-${s._id || i}`} className="w-28 shrink-0 sm:w-32">
                <SongCard song={s} queue={chillVibes} index={i} onAddToPlaylist={setAddToPlaylistSong} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 7. Editor's Picks ── */}
      <Section title="Editor's Picks" eyebrow="Chartbusters &amp; Superstars" status={sectionStatus}>
        {editorsPicks.slice(0, editorsVisible).map(cardsFor(editorsPicks))}
      </Section>
      {sectionStatus === "ready" && editorsPicks.length > editorsVisible && (
        <LoadMoreButton
          onClick={() => setEditorsVisible((v) => v + PAGE_SIZE)}
          disabled={editorsVisible >= editorsPicks.length}
          label="Load More"
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
          label="Load More"
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
          label="Load More"
        />
      )}

      <AddToPlaylistModal song={addToPlaylistSong} onClose={() => setAddToPlaylistSong(null)} />
    </div>
  );
};

export default Discover;
