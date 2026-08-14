import { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";

const Modal = ({ open, onClose, title, children, maxWidth = "max-w-md" }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`animate-slide-up w-full ${maxWidth} rounded-3xl border border-white/10 bg-[#161616] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)]`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h2 text-white">{title}</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <IoClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
