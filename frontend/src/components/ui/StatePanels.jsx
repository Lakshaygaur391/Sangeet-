import { IoRefresh, IoAlertCircleOutline } from "react-icons/io5";

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-[#141414] px-6 py-10 text-center">
    {icon && <div className="mb-3 text-3xl text-white/30">{icon}</div>}
    <p className="text-h3 text-white/85">{title}</p>
    {description && <p className="text-body mt-1.5 max-w-sm text-white/45">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message = "Something went wrong.", onRetry }) => (
  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] px-6 py-10 text-center">
    <IoAlertCircleOutline className="mb-3 text-3xl text-rose-400" />
    <p className="text-h3 text-white/85">Couldn't load this</p>
    <p className="text-body mt-1.5 max-w-sm text-white/45">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <IoRefresh /> Retry
      </button>
    )}
  </div>
);

export const InlineError = ({ message, onRetry }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200">
    <span>{message}</span>
    {onRetry && (
      <button type="button" onClick={onRetry} className="font-semibold text-rose-100 underline underline-offset-2">
        Retry
      </button>
    )}
  </div>
);
