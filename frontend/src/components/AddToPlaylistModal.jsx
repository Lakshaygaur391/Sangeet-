import { useState, useMemo } from "react";
import {
  IoAddCircleOutline,
  IoCheckmarkCircle,
  IoMusicalNotes,
  IoSearchOutline,
  IoClose,
} from "react-icons/io5";
import Modal from "./ui/Modal";
import CreatePlaylistModal from "./PlaylistModal";
import { useLibrary } from "../context/LibraryContext";
import { songId } from "../lib/media";

const AddToPlaylistModal = ({ song, onClose }) => {
  const { playlists, addSongToPlaylist } = useLibrary();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPlaylists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [playlists, search]);

  return (
    <>
      <Modal open={Boolean(song) && !createOpen} onClose={onClose} title="Add to Playlist">
        {/* Song preview card */}
        {song && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-inner">
            <img
              src={song.thumbnail_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{song.title}</p>
              <p className="truncate text-[11px] text-white/50">{song.artist}</p>
            </div>
          </div>
        )}

        {/* Search playlists input (if > 3 playlists) */}
        {playlists.length > 3 && (
          <div className="relative mb-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e0e0f] px-3 py-2 text-xs focus-within:border-amber-400/40">
              <IoSearchOutline className="text-sm text-white/40 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search playlists..."
                className="w-full bg-transparent text-white placeholder:text-white/30 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-white/40 hover:text-white"
                >
                  <IoClose />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Create new playlist trigger */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="mb-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-amber-400/35 bg-amber-400/[0.04] px-4 py-3 text-left text-sm font-bold text-amber-300 transition hover:bg-amber-400/[0.09] hover:border-amber-400/60"
        >
          <IoAddCircleOutline className="text-xl shrink-0" />
          <span>New Playlist</span>
        </button>

        {playlists.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/40">
            You don't have any playlists yet. Tap "New Playlist" above to create one.
          </p>
        ) : filteredPlaylists.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/40">
            No playlists found matching "{search}".
          </p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filteredPlaylists.map((p) => {
              const already = (p.songs || []).some((s) => songId(s) === songId(song));
              const coverImg = p.coverImage || p.songs?.[0]?.thumbnail_url;

              return (
                <button
                  key={p.id || p._id}
                  type="button"
                  onClick={() => {
                    addSongToPlaylist(p.id || p._id, song);
                    onClose();
                  }}
                  className={`group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                    already
                      ? "bg-amber-400/[0.08] text-amber-200 border border-amber-400/25"
                      : "bg-white/[0.02] text-white/80 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-sm"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm text-white/50 group-hover:text-amber-400 transition-colors">
                        <IoMusicalNotes />
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{p.name}</p>
                      <p className="text-[11px] text-white/40">
                        {(p.songs || []).length} {(p.songs || []).length === 1 ? "song" : "songs"}
                      </p>
                    </div>
                  </div>

                  {already ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 shrink-0">
                      <IoCheckmarkCircle className="text-lg" /> Added
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-white/30 group-hover:text-white/70 transition-colors shrink-0">
                      Add
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      <CreatePlaylistModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          onClose();
        }}
      />
    </>
  );
};

export default AddToPlaylistModal;
