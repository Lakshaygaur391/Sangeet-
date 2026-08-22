import { IoCheckmarkCircle, IoAlertCircle, IoInformationCircle, IoClose } from "react-icons/io5";
import { useUI } from "../../context/UIContext";

const ICONS = {
  success: <IoCheckmarkCircle className="text-emerald-400" />,
  error: <IoAlertCircle className="text-rose-400" />,
  info: <IoInformationCircle className="text-amber-300" />,
};

const ToastStack = () => {
  const { toasts, dismissToast } = useUI();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-toast-in pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-[#161616]/95 px-4 py-3 text-sm text-white shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <span className="text-lg">{ICONS[t.variant] || ICONS.info}</span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
            className="text-white/40 transition hover:text-white"
          >
            <IoClose />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
