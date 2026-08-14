import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  IoPlay, IoShuffle, IoEllipsisHorizontal, IoTrashOutline, IoPencilOutline,
  IoArrowUp, IoArrowDown, IoRemoveCircleOutline,
} from "react-icons/io5";
import Modal from "../components/ui/Modal";
import { EmptyState } from "../components/ui/StatePanels";
import { useLibrary } from "../context/LibraryContext";
import { usePlayer } from "../context/PlayerContext";
import { songId, normalizeSong } from "../lib/media";

const Playlist = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playlists, deletePlaylist, renamePlaylist, removeSongFromPlaylist, reorderPlaylist } = useLibrary();
  const { playSong } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const playlist = playlists.find((p) => (p.id || p._id) === id);
  const songs = useMemo(() => (playlist?.songs || []).map(normalizeSong), [playlist]);

  if (!playlist) {
    return (
      <EmptyState
        title="Playlist not found"
        description="It may have been deleted, or the link is out of date."
        action={
          <button type="button" onClick={() => navigate("/library")} className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300">
            Back to Library
          </button>
        }
      />
    );
  }

  const openEdit = () => {
    setName(playlist.name);
    setDescription(playlist.description || "");
    setEditOpen(true);
    setMenuOpen(false);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    renamePlaylist(playlist.id || playlist._id, { name: name.trim() || playlist.name, description });
    setEditOpen(false);
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= songs.length) return;
    const reordered = [...songs];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reorderPlaylist(playlist.id || playlist._id, reordered);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-transparent p-5 sm:flex-row sm:items-end">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 to-[#1a1a1a] text-5xl shadow-xl">
          🎵
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-meta text-amber-300">Playlist</p>
          <h1 className="text-h1 mt-1 truncate text-white">{playlist.name}</h1>
          {playlist.description && <p className="text-body mt-1 text-white/50">{playlist.description}</p>}
          <p className="text-caption mt-1">{songs.length} songs</p>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={songs.length === 0}
          onClick={() => playSong(songs[0], songs, 0)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Play playlist"
        >
          <IoPlay className="translate-x-0.5 text-xl" />
        </button>
        <button
          type="button"
          disabled={songs.length === 0}
          onClick={() => {
            const shuffled = [...songs].sort(() => 0.5 - Math.random());
            playSong(shuffled[0], shuffled, 0);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Shuffle play"
        >
          <IoShuffle className="text-lg" />
        </button>

        <div className="relative ml-auto">
          <button
            type="button"
            aria-label="More options"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/5"
          >
            <IoEllipsisHorizontal className="text-lg" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] py-1 shadow-xl">
              <button type="button" onClick={openEdit} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/5">
                <IoPencilOutline /> Edit details
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePlaylist(playlist.id || playlist._id);
                  navigate("/library");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/5"
              >
                <IoTrashOutline /> Delete playlist
              </button>
            </div>
          )}
        </div>
      </div>

      {songs.length === 0 ? (
        <EmptyState title="This playlist is empty" description="Add songs from anywhere in Sangeet using the overflow menu on a song." />
      ) : (
        <div className="space-y-0.5">
          {songs.map((song, i) => (
            <div key={songId(song)} className="group grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl px-1 hover:bg-white/[0.02]">
              <div className="min-w-0">
                <PlaylistRow song={song} queue={songs} index={i} />
              </div>
              <div className="flex items-center gap-1 pr-2 opacity-0 transition group-hover:opacity-100">
                <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="text-white/40 hover:text-white disabled:opacity-20">
                  <IoArrowUp />
                </button>
                <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === songs.length - 1} className="text-white/40 hover:text-white disabled:opacity-20">
                  <IoArrowDown />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${song.title} from playlist`}
                  onClick={() => removeSongFromPlaylist(playlist.id || playlist._id, song)}
                  className="text-white/40 hover:text-rose-300"
                >
                  <IoRemoveCircleOutline />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit playlist">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="text-caption mb-1 block">Name</label>
            <input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2.5 text-sm text-white focus:border-amber-400/60 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="edit-desc" className="text-caption mb-1 block">Description</label>
            <textarea
              id="edit-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2.5 text-sm text-white focus:border-amber-400/60 focus:outline-none"
            />
          </div>
          <button type="submit" className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-semibold text-black hover:bg-amber-300">
            Save changes
          </button>
        </form>
      </Modal>
    </div>
  );
};

// Small local row (keeps SongRow generic — playlist needs a plain index label,
// not the "hide number on hover to show play button" behavior differences).
const PlaylistRow = ({ song, queue, index }) => {
  const { currentSong, isPlaying, playSong, setIsPlaying } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const isActive = currentSong && songId(currentSong) === songId(song);

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-6 shrink-0 text-center text-sm text-white/35">{index + 1}</span>
      <button
        type="button"
        onClick={() => (isActive ? setIsPlaying(!isPlaying) : playSong(song, queue, index))}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <img src={song.thumbnail_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${isActive ? "text-amber-300" : "text-white"}`}>{song.title}</p>
          <p className="truncate text-xs text-white/40">{song.artist}</p>
        </div>
      </button>
      <button type="button" aria-label={isLiked(song) ? "Unlike" : "Like"} onClick={() => toggleLike(song)} className="shrink-0 text-white/40 hover:text-amber-300">
        {isLiked(song) ? "♥" : "♡"}
      </button>
    </div>
  );
};

export default Playlist;
