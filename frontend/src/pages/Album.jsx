import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { IoPlay, IoShuffle, IoArrowBack, IoDiscOutline, IoTimeOutline, IoMusicalNotes } from "react-icons/io5";
import SongRow from "../components/song/SongRow";
import AddToPlaylistModal from "../components/AddToPlaylistModal";
import { EmptyState } from "../components/ui/StatePanels";
import { SkeletonList } from "../components/ui/Skeleton";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import albumService from "../services/albumService";
import songService from "../services/songService";
import { normalizeSong } from "../lib/media";

const DEFAULT_COVER = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60";

const Album = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { playSong } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt } = useUI();

  const [loading, setLoading] = useState(true);
  const [album, setAlbum] = useState(null);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState(null);

  // Safely parse album parameter from route
  const albumName = useMemo(() => {
    const rawParam = params.id
      ? params["*"]
        ? `${params.id}/${params["*"]}`
        : params.id
      : params["*"] || "";
    let decoded = rawParam;
    try {
      decoded = decodeURIComponent(rawParam);
    } catch (_) {}
    return decoded.trim();
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadAlbum() {
      if (!albumName) {
        setLoading(false);
        setAlbum(null);
        return;
      }

      try {
        // 1. Try fetching from backend API
        const data = await albumService.getById(albumName);
        if (!cancelled && data && Array.isArray(data.songs) && data.songs.length > 0) {
          setAlbum(data);
          setLoading(false);
          return;
        }

        // 2. Client-side fallback: synthesize album from catalog songs
        const allSongs = await songService.getAll();
        const target = albumName.toLowerCase().trim();
        const matched = (allSongs || []).filter((s) => {
          const alb = (s.album || "").toLowerCase().trim();
          const tit = (s.title || "").toLowerCase().trim();
          return alb === target || (alb && alb.includes(target)) || (target && alb && target.includes(alb)) || tit.includes(target);
        });

        if (!cancelled) {
          if (matched.length > 0) {
            const sorted = [...matched].sort((a, b) => parseInt(b.year || 0, 10) - parseInt(a.year || 0, 10));
            const sample = sorted[0] || {};
            setAlbum({
              name: sample.album || albumName,
              coverImage: sample.thumbnail_url || "",
              releaseYear: sample.year || "",
              artist: sample.artist || "",
              language: sample.language || "",
              songCount: sorted.length,
              songs: sorted,
            });
          } else {
            // Provide a graceful fallback container so UI never crashes
            setAlbum({
              name: albumName,
              coverImage: "",
              releaseYear: "",
              artist: "",
              language: "",
              songCount: 0,
              songs: [],
            });
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn("Error loading album:", err);
        if (!cancelled) {
          setAlbum({
            name: albumName,
            coverImage: "",
            releaseYear: "",
            artist: "",
            language: "",
            songCount: 0,
            songs: [],
          });
          setLoading(false);
        }
      }
    }

    loadAlbum();
    return () => {
      cancelled = true;
    };
  }, [albumName]);

  const songs = useMemo(() => {
    if (!album || !Array.isArray(album.songs)) return [];
    return album.songs.map((s) => {
      try {
        return normalizeSong(s);
      } catch (_) {
        return s;
      }
    });
  }, [album]);

  const coverImage = useMemo(() => {
    return album?.coverImage || songs[0]?.thumbnail_url || DEFAULT_COVER;
  }, [album, songs]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 w-full rounded-3xl bg-white/5" />
        <SkeletonList count={6} />
      </div>
    );
  }

  const hasSongs = songs.length > 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Top navigation back button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/70 backdrop-blur-md transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <IoArrowBack className="text-sm" />
          <span>Back</span>
        </button>
        <span className="text-xs text-white/30">/</span>
        <span className="text-xs font-medium text-white/50 truncate max-w-xs">{album?.name || albumName}</span>
      </div>

      {/* Hero header with ambient blurred cover background */}
      <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c0c0e] shadow-2xl">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: coverImage ? `url("${coverImage.replace(/"/g, '\\"')}")` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(60px) brightness(0.25) saturate(140%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/80 to-transparent" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end md:p-8" style={{ minHeight: "15rem" }}>
          <img
            src={coverImage}
            alt={album?.name || "Album artwork"}
            className="h-36 w-36 shrink-0 rounded-2xl object-cover shadow-2xl ring-1 ring-white/15 sm:h-48 sm:w-48 transition-transform duration-300 hover:scale-102"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_COVER;
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                <IoDiscOutline className="text-xs" /> Album &amp; Soundtrack
              </span>
              {album?.language && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/60">
                  {album.language}
                </span>
              )}
            </div>

            <h1 className="text-h1 mt-2 text-white font-black leading-tight drop-shadow-md break-words">
              {album?.name || albumName}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-white/65">
              {album?.artist && (
                <>
                  <span className="text-white font-semibold">{album.artist}</span>
                  <span>·</span>
                </>
              )}
              {album?.releaseYear && (
                <>
                  <span className="text-amber-400 font-semibold">{album.releaseYear}</span>
                  <span>·</span>
                </>
              )}
              <span>{songs.length} {songs.length === 1 ? "track" : "tracks"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!hasSongs}
          onClick={() => {
            if (!isAuthenticated) {
              openAuthPrompt("default");
              return;
            }
            playSong(songs[0], songs, 0);
          }}
          className="flex items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 cursor-pointer"
          style={{ width: "3.25rem", height: "3.25rem" }}
          aria-label="Play all album tracks"
        >
          <IoPlay className="translate-x-0.5 text-2xl" />
        </button>

        <button
          type="button"
          disabled={!hasSongs}
          onClick={() => {
            if (!isAuthenticated) {
              openAuthPrompt("default");
              return;
            }
            const shuffled = [...songs].sort(() => 0.5 - Math.random());
            playSong(shuffled[0], shuffled, 0);
          }}
          className="flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30 cursor-pointer shadow-md"
          style={{ width: "3rem", height: "3rem" }}
          aria-label="Shuffle album"
        >
          <IoShuffle className="text-xl" />
        </button>

        {hasSongs && (
          <span className="text-xs font-semibold text-white/40 ml-2">
            Ready to stream • 320kbps High Definition
          </span>
        )}
      </div>

      {/* Tracklist section */}
      {!hasSongs ? (
        <EmptyState
          icon={<IoDiscOutline />}
          title={`No songs found in "${album?.name || albumName}"`}
          description="We couldn't find any songs matching this album or soundtrack in the catalog yet."
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-amber-300"
            >
              Browse Home Feed
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-white/40">
            <span># &nbsp; Title</span>
            <span className="flex items-center gap-1"><IoTimeOutline /> Duration</span>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#101012] p-2 divide-y divide-white/[0.04]">
            {songs.map((song, i) => (
              <SongRow
                key={song._id || song.id || `${song.title}-${i}`}
                song={song}
                queue={songs}
                index={i}
                onAddToPlaylist={setAddToPlaylistSong}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add to playlist modal */}
      {addToPlaylistSong && (
        <AddToPlaylistModal
          song={addToPlaylistSong}
          onClose={() => setAddToPlaylistSong(null)}
        />
      )}
    </div>
  );
};

export default Album;
