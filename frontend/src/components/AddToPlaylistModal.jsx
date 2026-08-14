import { useState } from "react";
import { IoAddCircleOutline, IoCheckmarkCircle } from "react-icons/io5";
import Modal from "./ui/Modal";
import CreatePlaylistModal from "./PlaylistModal";
import { useLibrary } from "../context/LibraryContext";
import { songId } from "../lib/media";

const AddToPlaylistModal = ({ song, onClose }) => {
  const { playlists, addSongToPlaylist } = useLibrary();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Modal open={Boolean(song) && !createOpen} onClose={onClose} title="Add to playlist">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="mb-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 px-3 py-3 text-left text-sm font-semibold text-amber-300 transition hover:bg-white/5"
        >
          <IoAddCircleOutline className="text-lg" /> New playlist
        </button>

        {playlists.length === 0 ? (
          <p className="text-body text-white/40">You don't have any playlists yet.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {playlists.map((p) => {
              const already = (p.songs || []).some((s) => songId(s) === songId(song));
              return (
                <button
                  key={p.id || p._id}
                  type="button"
                  onClick={() => {
                    addSongToPlaylist(p.id || p._id, song);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/5"
                >
                  <span className="truncate">{p.name}</span>
                  {already && <IoCheckmarkCircle className="shrink-0 text-amber-400" />}
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      <CreatePlaylistModal open={createOpen} onClose={() => { setCreateOpen(false); onClose(); }} />
    </>
  );
};

export default AddToPlaylistModal;
