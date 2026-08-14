import { useEffect, useMemo, useState } from "react";
import Section from "../components/Section";
import SongCard from "../components/song/SongCard";
import ArtistCard from "../components/artist/ArtistCard";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import { EmptyState } from "../components/ui/StatePanels";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService from "../services/songService";
import artistService from "../services/artistService";
import { normalizeSong } from "../lib/media";

const GREETINGS = ["Welcome back", "Good to see you", "Ready to listen"];

const Home = () => {
  const { songList, setSongList, playSong } = usePlayer();
  const { recentlyPlayed } = useLibrary();
  const { user, isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [status, setStatus] = useState("loading");
  const [artists, setArtists] = useState([]);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  const greeting = useMemo(() => GREETINGS[new Date().getDate() % GREETINGS.length], []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      const [songs, artistList] = await Promise.all([songService.getAll(), artistService.getAll()]);
      if (cancelled) return;
      if (songs === null) {
        setStatus("error");
        return;
      }
      setSongList(songs);
      setArtists(artistList || []);
      setStatus("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const songs = useMemo(() => songList.map(normalizeSong), [songList]);
  const byLanguage = (lang) => songs.filter((s) => s.language === lang);

  const featured = songs[0];
  const fresh = songs.slice(0, 12);
  const trending = useMemo(() => [...songs].sort(() => 0.5 - Math.random()).slice(0, 12), [songs]);
  const regions = ["Punjabi", "Haryanvi", "Bhojpuri", "Hindi", "English"].map((lang) => ({
    lang,
    songs: byLanguage(lang),
  })).filter((r) => r.songs.length > 0);

  const sectionStatus = status === "loading" ? "loading" : status === "error" ? "error" : songs.length === 0 ? "empty" : "ready";

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

      <Section title="Fresh on Sangeet" eyebrow="Just added" status={sectionStatus} onRetry={() => window.location.reload()} id="fresh">
        {fresh.map((song, i) => (
          <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
            <SongCard song={song} queue={fresh} index={i} onAddToPlaylist={setAddToPlaylistSong} />
          </div>
        ))}
      </Section>

      {recentlyPlayed.length > 0 && (
        <Section title="Your Sound" eyebrow="Because you listened" status="ready">
          {recentlyPlayed.slice(0, 12).map((song, i) => (
            <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
              <SongCard song={song} queue={recentlyPlayed} index={i} onAddToPlaylist={setAddToPlaylistSong} />
            </div>
          ))}
        </Section>
      )}

      <Section title="Trending in India" eyebrow="Hot right now" status={sectionStatus} seeAllHref="/discover" id="trending">
        {trending.map((song, i) => (
          <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
            <SongCard song={song} queue={trending} index={i} onAddToPlaylist={setAddToPlaylistSong} />
          </div>
        ))}
      </Section>

      {status === "ready" && regions.length === 0 ? (
        <EmptyState title="No regional music yet" description="Regional collections will appear once songs are tagged with a language." />
      ) : (
        <div id="regional" className="scroll-mt-24 space-y-4 md:space-y-6">
          {regions.map((region) => (
            <Section key={region.lang} title={`${region.lang} Spotlight`} eyebrow="Regional Spotlight" status="ready">
              {region.songs.map((song, i) => (
                <div key={song._id || i} className="w-36 shrink-0 sm:w-40 md:w-44">
                  <SongCard song={song} queue={region.songs} index={i} onAddToPlaylist={setAddToPlaylistSong} />
                </div>
              ))}
            </Section>
          ))}
        </div>
      )}

      <Section
        title="Artists to Explore"
        status={status === "loading" ? "loading" : artists.length === 0 ? "empty" : "ready"}
        emptyTitle="No artists yet"
        emptyDescription="Artists will show up here once your library has some."
        id="artists"
      >
        {artists.map((artist) => (
          <ArtistCard key={artist.id || artist.name} artist={artist} />
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
