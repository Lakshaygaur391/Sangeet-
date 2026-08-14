import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./ui/Modal";
import { useLibrary } from "../context/LibraryContext";

const CreatePlaylistModal = ({ open, onClose }) => {
  const { createPlaylist } = useLibrary();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setIsPublic(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const playlist = await createPlaylist({ name, description, isPublic });
    setSubmitting(false);
    reset();
    onClose();
    if (playlist) navigate(`/playlist/${playlist.id || playlist._id}`);
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Create Playlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="playlist-name" className="text-caption mb-1 block">Playlist name</label>
          <input
            id="playlist-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Monsoon Mix"
            className="w-full rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/60 focus:outline-none"
            required
          />
        </div>

        <div>
          <label htmlFor="playlist-desc" className="text-caption mb-1 block">Description (optional)</label>
          <textarea
            id="playlist-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this playlist about?"
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/60 focus:outline-none"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded accent-amber-400"
          />
          Make this playlist public
        </label>

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full rounded-full bg-amber-400 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Creating…" : "Create"}
        </button>
      </form>
    </Modal>
  );
};

export default CreatePlaylistModal;
