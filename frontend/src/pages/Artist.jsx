import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { IoPlay, IoCheckmarkCircle, IoPersonAddOutline, IoPersonRemoveOutline } from "react-icons/io5";
import SongRow from "../components/song/SongRow";
import ArtistCard from "../components/artist/ArtistCard";
import { SkeletonList } from "../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../components/ui/StatePanels";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import songService from "../services/songService";
import { normalizeSong, avatarFor, getArtistImage } from "../lib/media";

const Artist = () => {
  const { name } = useParams();
  const { songList, setSongList, playSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();
  const [status, setStatus] = useState("loading");
  const [following, setFollowing] = useState(false);

  const decodedName = decodeURIComponent(name || "").trim();

  const handleFollowToggle = () => {
    if (!isAuthenticated) {
      openAuthPrompt("follow");
      return;
    }
    setFollowing((v) => !v);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (songList.length > 0) return setStatus("ready");
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
  const artistSongs = useMemo(
    () => songs.filter((s) => s.artist.toLowerCase() === decodedName.toLowerCase()),
    [songs, decodedName]
  );

  const artistCover = useMemo(() => {
    const songWithThumb = artistSongs.find((s) => s.thumbnail_url && !s.thumbnail_url.includes("ui-avatars.com"));
    return getArtistImage(decodedName, songWithThumb?.thumbnail_url);
  }, [artistSongs, decodedName]);

  const relatedArtists = useMemo(() => {
    const languages = new Set(artistSongs.map((s) => s.language));
    const names = new Set();
    const list = [];
    songs.forEach((s) => {
      if (s.artist !== decodedName && languages.has(s.language) && !names.has(s.artist)) {
        names.add(s.artist);
        list.push({
          name: s.artist,
          image: getArtistImage(s.artist, s.thumbnail_url),
          songs: songs.filter((song) => song.artist === s.artist),
        });
      }
    });
    return list.slice(0, 8);
  }, [songs, artistSongs, decodedName]);

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="skeleton h-56 w-full rounded-3xl" />
        <SkeletonList count={6} />
      </div>
    );
  }

  if (status === "error") {
    return <ErrorState message="Couldn't load this artist right now." onRetry={() => window.location.reload()} />;
  }

  if (artistSongs.length === 0) {
    return <EmptyState title="Artist not found" description={`No songs found for "${decodedName}".`} />;
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121214] shadow-2xl">
        <img
          src={artistCover}
          alt=""
          className="h-60 w-full object-cover scale-105 blur-md brightness-[0.35] transition-all duration-700 md:h-80"
        />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#0f0f11] via-[#0f0f11]/60 to-transparent p-5 md:p-8">
          <div className="flex items-end gap-5 md:gap-6">
            <div className="relative shrink-0">
              <img
                src={artistCover}
                alt={decodedName}
                className="h-28 w-28 rounded-full border-4 border-[#0f0f11] object-cover shadow-2xl md:h-36 md:w-36 ring-2 ring-amber-400/40"
              />
            </div>
            <div>
              <p className="text-meta flex items-center gap-1.5 text-amber-300 font-medium">
                <IoCheckmarkCircle className="text-base" /> Verified Artist
              </p>
              <h1 className="text-display mt-1 text-white font-bold tracking-tight text-3xl md:text-5xl">{decodedName}</h1>
              <p className="text-body mt-2 text-white/70 font-medium">{artistSongs.length} tracks available</p>
            </div>
          </div>
        </div>
      </header>


      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              openAuthPrompt("default");
              return;
            }
            playSong(artistSongs[0], artistSongs, 0);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-black transition hover:bg-amber-300"
          aria-label={`Play ${decodedName}`}
        >
          <IoPlay className="translate-x-0.5 text-xl" />
        </button>
        <button
          type="button"
          onClick={handleFollowToggle}
          aria-pressed={following}
          className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
            following ? "border-white/20 bg-white/10 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
          }`}
        >
          {following ? <IoPersonRemoveOutline /> : <IoPersonAddOutline />}
          {following ? "Following" : "Follow"}
        </button>
      </div>

      <div>
        <h2 className="text-h2 mb-2 text-white">Popular</h2>
        <div>
          {artistSongs.slice(0, 10).map((song, i) => (
            <SongRow key={song._id || i} song={song} queue={artistSongs} index={i} showIndex />
          ))}
        </div>
      </div>

      {relatedArtists.length > 0 && (
        <div>
          <h2 className="text-h2 mb-3 text-white">Related Artists</h2>
          <div className="scrollbar-none flex gap-3 overflow-x-auto md:gap-4">
            {relatedArtists.map((a) => (
              <ArtistCard key={a.name} artist={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Artist;
