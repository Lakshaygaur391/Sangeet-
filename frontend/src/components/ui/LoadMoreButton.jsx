/**
 * LoadMoreButton — reusable "Load More" button for song/section lists.
 * Props:
 *   onClick  – function to call when clicked
 *   loading  – bool: show a spinner instead of text
 *   disabled – bool: no more items to load; hides button
 *   label    – string: button label (default "Load More")
 */
const LoadMoreButton = ({ onClick, loading = false, disabled = false, label = "Load More" }) => {
  if (disabled) return null;

  return (
    <div className="load-more-wrap">
      <button
        type="button"
        className="load-more-btn"
        onClick={onClick}
        disabled={loading}
        aria-label={label}
      >
        {loading ? (
          <span className="load-more-spinner" aria-hidden="true" />
        ) : (
          <>
            <span>{label}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </button>

      <style>{`
        .load-more-wrap {
          display: flex;
          justify-content: center;
          padding: 12px 0 4px;
        }
        .load-more-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 22px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.75);
          font-size: 0.82rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.15s ease;
          backdrop-filter: blur(6px);
        }
        .load-more-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.3);
          color: #fff;
          transform: translateY(-1px);
        }
        .load-more-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .load-more-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .load-more-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: rgba(255,255,255,0.8);
          border-radius: 50%;
          animation: lm-spin 0.7s linear infinite;
        }
        @keyframes lm-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadMoreButton;
