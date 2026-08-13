import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { usePlayer } from "./playerContext";

const getVideoId = (url) => {
  if (!url) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/)?.[1] || null;
};

const DEFAULT_THUMBNAIL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231f1f23'/%3E%3Cstop offset='100%25' stop-color='%230f0f12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='200' cy='200' r='60' fill='%232a2a30'/%3E%3Cpath d='M190 170v60l50-30z' fill='%23f59e0b'/%3E%3C/svg%3E";

const getSongThumbnail = (song) => {
  const direct = song?.thumbnail_url || song?.image;
  if (direct) return direct;

  const videoId = getVideoId(song?.youtube_url || song?.videoUrl || "");
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : DEFAULT_THUMBNAIL;
};

const ArtistPage = () => {
  const { artistName } = useParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setCurrentVideoId, setCurrentIndex, setSongList } = usePlayer();

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/artists");
        const normalizedName = decodeURIComponent(artistName || "").trim();
        const match = (res.data || []).find((item) => {
          const name = String(item?.name || "").trim();
          return name.toLowerCase() === normalizedName.toLowerCase();
        });

        setArtist(match || null);
      } catch (err) {
        console.error("Error fetching artist page:", err);
        setArtist(null);
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistName]);

  const songs = useMemo(() => artist?.songs || [], [artist]);

  const handleSongClick = async (song, index) => {
    let videoId = getVideoId(song?.youtube_url || song?.videoUrl || "");

    if (!videoId && song?.title && song?.artist) {
      try {
        const res = await axios.get("http://localhost:5000/api/resolve-song", {
          params: {
            title: song.title,
            artist: song.artist,
          },
        });
        videoId = getVideoId(res.data?.youtube_url || res.data?.videoId || "");
      } catch (err) {
        console.error("Unable to resolve artist song:", err);
        return;
      }
    }

    if (!videoId) return;

    setSongList(songs);
    setCurrentIndex(index);
    setCurrentVideoId(videoId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl text-lg">Loading artist...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#121212] px-4 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-2xl font-bold">Artist not found</p>
          <Link to="/" className="text-amber-400 underline">Go back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-300 transition hover:text-white">
          <span className="text-lg">←</span>
          Back to home
        </Link>

        <div className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_22%),linear-gradient(135deg,#2a0a0a_0%,#4c1010_35%,#1d1d1d_100%)] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.35)] md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex items-center justify-center md:justify-start">
              <img
                src={artist.image || "https://ui-avatars.com/api/?name=" + encodeURIComponent(artist.name) + "&background=random"}
                alt={artist.name}
                className="h-28 w-28 rounded-full border-4 border-white/20 object-cover shadow-[0_25px_50px_rgba(0,0,0,0.35)] md:h-40 md:w-40"
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/80">Artist</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl xl:text-7xl">{artist.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80 md:text-base">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{songs.length} songs</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Punjabi</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Featured playlist</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#171717] p-4 shadow-xl shadow-black/20 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gray-400">Popular tracks</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
              {songs.length} total
            </span>
          </div>

          {songs.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#1c1c1c] text-gray-400">
              No songs available for this artist yet.
            </div>
          ) : (
            <div className="space-y-2">
              {songs.map((song, index) => {
                const songTitle = song.title || "Unknown Song";
                const songArtist = song.artist || artist.name;
                const thumbnail = getSongThumbnail(song);

                return (
                  <button
                    key={song._id || song.id || `${songTitle}-${index}`}
                    type="button"
                    onClick={() => handleSongClick(song, index)}
                    className="grid w-full grid-cols-[1.7fr_1fr_0.7fr] items-center gap-3 rounded-2xl border border-transparent bg-[#1d1d1d] px-2 py-3 text-left transition hover:border-white/10 hover:bg-white/5 md:px-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2b2b2b] text-xs text-white/80 md:h-12 md:w-12">
                        #{index + 1}
                      </div>
                      <img
                        src={thumbnail}
                        alt={songTitle}
                        className="h-10 w-10 rounded-md object-cover bg-[#2a2a2a] md:h-12 md:w-12"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white md:text-lg">{songTitle}</p>
                      </div>
                    </div>

                    <div className="truncate text-sm text-gray-300 md:text-base">{songArtist}</div>

                    <div className="flex justify-end">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#252525] text-lg text-white/80 md:h-10 md:w-10">
                        ▶
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistPage;
