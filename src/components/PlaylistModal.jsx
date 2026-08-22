import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoLockClosedOutline, IoGlobeOutline, IoMusicalNotesOutline } from "react-icons/io5";
import Modal from "./ui/Modal";
import { useLibrary } from "../context/LibraryContext";

const CreatePlaylistModal = ({ open, onClose }) => {
  const { createPlaylist } = useLibrary();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    setName("");
    setDescription("");
    setIsPublic(true);
    setSubmitting(false);
    onClose?.();
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || submitting) return;

    setSubmitting(true);
    const playlist = await createPlaylist({
      name: cleanName,
      description: description.trim(),
      isPublic,
    });
    setSubmitting(false);
    handleClose();
    if (playlist) {
      navigate(`/playlist/${playlist.id || playlist._id}`);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Playlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Playlist Icon Header */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/20 text-2xl text-amber-400">
            <IoMusicalNotesOutline />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Custom Collection</p>
            <p className="text-xs text-white/40">Add your favourite tracks and share them with friends.</p>
          </div>
        </div>

        {/* Playlist Name Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="playlist-name-input" className="text-xs font-semibold text-white/80">
              Playlist Name <span className="text-amber-400">*</span>
            </label>
            <span className="text-[10px] text-white/30">{name.length}/100</span>
          </div>
          <input
            id="playlist-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="off"
            placeholder="e.g. Late Night Vibes, Workout Hits 2026..."
            className="w-full rounded-xl border border-white/10 bg-[#0e0e0f] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 transition focus:border-amber-400/60 focus:bg-[#121214] focus:outline-none focus:ring-1 focus:ring-amber-400/30"
            required
          />
        </div>

        {/* Description Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="playlist-desc-input" className="text-xs font-semibold text-white/80">
              Description (optional)
            </label>
            <span className="text-[10px] text-white/30">{description.length}/300</span>
          </div>
          <textarea
            id="playlist-desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            placeholder="Give your playlist a mood, vibe, or story..."
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-[#0e0e0f] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 transition focus:border-amber-400/60 focus:bg-[#121214] focus:outline-none focus:ring-1 focus:ring-amber-400/30"
          />
        </div>

        {/* Privacy Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/80">Privacy</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                isPublic
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
              }`}
            >
              <IoGlobeOutline className="text-lg shrink-0 text-amber-400" />
              <div>
                <p className="text-xs font-bold">Public</p>
                <p className="text-[10px] text-white/40">Visible to everyone</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                !isPublic
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
              }`}
            >
              <IoLockClosedOutline className="text-lg shrink-0 text-white/50" />
              <div>
                <p className="text-xs font-bold">Private</p>
                <p className="text-[10px] text-white/40">Only you can view</p>
              </div>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full rounded-full bg-gradient-to-br from-amber-300 to-amber-500 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Creating…" : "Create Playlist"}
        </button>
      </form>
    </Modal>
  );
};

export default CreatePlaylistModal;
