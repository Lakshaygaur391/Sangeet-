import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  IoChevronForward,
  IoChevronBack,
  IoClose,
} from "react-icons/io5";
import { usePlayer } from "../../context/PlayerContext";
import { useLibrary } from "../../context/LibraryContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import playlistService from "../../services/playlistService";

/**
 * Responsive context options menu:
 * - Mobile (< 640px): Portaled native slide-up Bottom Action Sheet sitting on top of mini-player and nav.
 * - Desktop (>= 640px): High-contrast crisp floating dropdown anchored to the card.
 */
const MediaOptionsMenu = ({
  isOpen,
  onClose,
  song,
  playlist,
  queue,
  index = 0,
  onAddToPlaylist,
  align = "right", // "right" | "left"
  position = "bottom", // "bottom" | "top"
  itemType = "song", // "song" | "album" | "playlist"
}) => {
  const [view, setView] = useState("main"); // "main" | "share"
  const menuRef = useRef(null);

  const { playSong, addToQueue } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt, toast } = useUI();

  // Reset to main view whenever menu opens
  useEffect(() => {
    if (isOpen) {
      setView("main");
    }
  }, [isOpen]);

  // Click outside and escape key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPlaylistType = itemType === "playlist" || !!playlist;
  const targetItem = playlist || song;
  if (!targetItem) return null;

  const title = targetItem.title || targetItem.name || "Track";
  const artist = targetItem.artist || targetItem.owner || "Sangeet";
  const thumbnail =
    song?.thumbnail_url ||
    playlist?.coverImage ||
    (Array.isArray(playlist?.songs) && playlist.songs[0]?.thumbnail_url) ||
    "";
  const liked = !isPlaylistType && song ? isLiked(song) : false;

  // 1. Save to Library
  const handleSaveToLibrary = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onClose();
      openAuthPrompt("like");
      return;
    }
    if (isPlaylistType) {
      toast(`Saved "${title}" to your Library`, "success");
    } else if (song) {
      toggleLike(song);
      toast(liked ? "Removed from Library" : "Saved to Library", "success");
    }
    onClose();
  };

  // 2. Play Album Now / Play Now
  const handlePlayNow = async (e) => {
    e.stopPropagation();
    onClose();
    if (isPlaylistType && playlist) {
      if (Array.isArray(playlist.songs) && playlist.songs.length > 0) {
        playSong(playlist.songs[0], playlist.songs, 0);
        toast(`Playing "${title}"`, "success");
        return;
      }
      if (playlist.isYearly || /^\d{4}$/.test(playlist.name)) {
        try {
          const y = playlist.year || parseInt(playlist.name, 10);
          const res = await playlistService.getYear(y);
          if (res?.songs?.length > 0) {
            playSong(res.songs[0], res.songs, 0);
            toast(`Playing "${title}"`, "success");
            return;
          }
        } catch (err) {
          console.error("Play yearly failed:", err);
        }
      }
      toast(`Playing "${title}"`, "success");
    } else if (song) {
      playSong(song, queue || [song], index);
      toast(`Playing "${title}"`, "success");
    }
  };

  // 3. Add to Queue
  const handleAddToQueue = (e) => {
    e.stopPropagation();
    if (isPlaylistType && playlist?.songs?.length) {
      playlist.songs.forEach((s) => addToQueue(s));
      toast(`Added ${playlist.songs.length} songs from "${title}" to queue`, "success");
    } else if (song) {
      addToQueue(song);
      toast(`Added "${title}" to queue`, "success");
    }
    onClose();
  };

  // 4. Add to Playlist
  const handleAddToPlaylistClick = (e) => {
    e.stopPropagation();
    onClose();
    if (!isAuthenticated) {
      openAuthPrompt("playlist");
      return;
    }
    if (onAddToPlaylist && song) {
      onAddToPlaylist(song);
    } else {
      toast(`Added "${title}" to playlist`, "success");
    }
  };

  // Share URL creation
  const shareUrl =
    typeof window !== "undefined"
      ? isPlaylistType && playlist?.id
        ? `${window.location.origin}/playlist/${playlist.id || playlist._id}`
        : `${window.location.origin}/search?q=${encodeURIComponent(title)}`
      : "";

  const handleCopyLink = (e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch {
      /* ignore */
    }
    toast("Link copied to clipboard!", "success");
    onClose();
  };

  const handleTwitterShare = (e) => {
    e.stopPropagation();
    const text = `Listen to "${title}" on Sangeet!`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
    onClose();
  };

  const handleFacebookShare = (e) => {
    e.stopPropagation();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
    onClose();
  };

  const handleEmailShare = (e) => {
    e.stopPropagation();
    const subject = `Check out "${title}" on Sangeet`;
    const body = `Hey,\n\nCheck out "${title}" by ${artist} on Sangeet:\n${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    onClose();
  };

  const handleWhatsAppShare = (e) => {
    e.stopPropagation();
    const text = `Listen to "${title}" by ${artist} on Sangeet: ${shareUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    onClose();
  };

  // Mobile Portaled Bottom Sheet Panel
  const mobileSheet = (
    <div
      className="fixed inset-0 z-[999] sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Options"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Dimmed backdrop covering mini player and bottom nav */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-up White Panel on top of everything */}
      <div className="fixed bottom-0 left-0 right-0 z-[1000] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 shadow-[0_-16px_50px_rgba(0,0,0,0.6)] animate-slide-up">
        {/* Top drag handle */}
        <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-gray-300" />

        {/* Media Header Preview */}
        <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                className="h-12 w-12 rounded-xl object-cover shadow-sm shrink-0"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 shrink-0 font-bold">
                ♪
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{title}</p>
              <p className="truncate text-xs text-gray-500 mt-0.5">{artist}</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 ml-2 shrink-0"
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        {/* Actions List */}
        {view === "main" ? (
          <div className="flex flex-col py-1">
            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>{liked ? "Remove from Library" : "Save to Library"}</span>
            </button>

            <button
              type="button"
              onClick={handlePlayNow}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Play Album Now</span>
            </button>

            <button
              type="button"
              onClick={handleAddToQueue}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Add to Queue</span>
            </button>

            <button
              type="button"
              onClick={handleAddToPlaylistClick}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Add to Playlist</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setView("share");
              }}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Share</span>
              <IoChevronForward className="text-base text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col py-1 animate-fade-in">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setView("main");
              }}
              className="flex w-full items-center gap-2 py-2.5 px-3 text-left text-[14px] font-bold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <IoChevronBack className="text-lg text-gray-600" />
              <span>Back</span>
            </button>

            <div className="border-b border-gray-100 my-1" />

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Copy Link</span>
            </button>

            <button
              type="button"
              onClick={handleTwitterShare}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Twitter</span>
            </button>

            <button
              type="button"
              onClick={handleFacebookShare}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Facebook</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleEmailShare}
              className="flex w-full items-center justify-between py-3 px-3 text-left text-[14px] font-semibold text-[#2d2d2d] active:bg-[#e6f7f5] active:text-[#0b655b] rounded-xl transition-colors"
            >
              <span>Email</span>
            </button>
          </div>
        )}

        {/* Cancel button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-2xl bg-gray-100 py-3 text-center text-sm font-bold text-gray-700 active:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Portaled Mobile Sheet (bypasses parent stacking contexts & z-indexes) */}
      {typeof document !== "undefined" && createPortal(mobileSheet, document.body)}

      {/* Desktop Floating Popup (Screen width >= 640px) */}
      <div
        ref={menuRef}
        role="menu"
        aria-label="Options"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`hidden sm:block animate-scale-in absolute z-50 w-52 sm:w-56 overflow-hidden rounded-2xl border border-gray-200/80 bg-white py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35),0_3px_10px_rgba(0,0,0,0.12)] transition-all duration-150 ${
          align === "right" ? "right-0" : "left-0"
        } ${position === "top" ? "bottom-full mb-2" : "top-full mt-1.5"}`}
      >
        {view === "main" ? (
          <div className="flex flex-col py-0.5">
            {/* 1. Save to Library */}
            <button
              type="button"
              role="menuitem"
              onClick={handleSaveToLibrary}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>{liked ? "Remove from Library" : "Save to Library"}</span>
            </button>

            {/* 2. Play Album Now / Play Now */}
            <button
              type="button"
              role="menuitem"
              onClick={handlePlayNow}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Play Album Now</span>
            </button>

            {/* 3. Add to Queue */}
            <button
              type="button"
              role="menuitem"
              onClick={handleAddToQueue}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Add to Queue</span>
            </button>

            {/* 4. Add to Playlist */}
            <button
              type="button"
              role="menuitem"
              onClick={handleAddToPlaylistClick}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Add to Playlist</span>
            </button>

            {/* 5. Share > */}
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setView("share");
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Share</span>
              <IoChevronForward className="text-sm text-gray-500" />
            </button>
          </div>
        ) : (
          /* ── Share Submenu View ── */
          <div className="flex flex-col py-0.5 animate-fade-in">
            {/* Header: < Back */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setView("main");
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-bold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <IoChevronBack className="text-base text-gray-600" />
              <span>Back</span>
            </button>

            {/* Thin subtle divider below Back */}
            <div className="border-b border-gray-100 my-0.5" />

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Copy Link</span>
            </button>

            {/* Twitter */}
            <button
              type="button"
              onClick={handleTwitterShare}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Twitter</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookShare}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Facebook</span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>WhatsApp</span>
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={handleEmailShare}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-[#2d2d2d] transition-colors duration-150 hover:bg-[#e6f7f5] hover:text-[#0b655b]"
            >
              <span>Email</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default MediaOptionsMenu;
