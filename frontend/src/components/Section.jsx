import { Link } from "react-router-dom";
import { SkeletonCard } from "./ui/Skeleton";
import { EmptyState } from "./ui/StatePanels";
import { InlineError } from "./ui/StatePanels";

// Modular horizontal-scroll section used across Home / Discover / Library.
// status: "loading" | "error" | "empty" | "ready"
const Section = ({
  title,
  eyebrow,
  status = "ready",
  error,
  onRetry,
  seeAllHref,
  children,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Check back soon.",
  id,
}) => {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-lg shadow-black/20 md:p-5">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          {eyebrow && <p className="text-meta mb-1">{eyebrow}</p>}
          <h2 className="text-h2 text-white">{title}</h2>
        </div>
        {seeAllHref && status === "ready" && (
          <Link to={seeAllHref} className="text-caption shrink-0 font-semibold text-amber-300 hover:text-amber-200">
            See all
          </Link>
        )}
      </div>

      {status === "loading" && (
        <div className="flex gap-3 overflow-x-hidden px-1 py-1 md:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-36 shrink-0 sm:w-40 md:w-44">
              <SkeletonCard />
            </div>
          ))}
        </div>
      )}

      {status === "error" && <InlineError message={error || "Couldn't load this section."} onRetry={onRetry} />}

      {status === "empty" && <EmptyState title={emptyTitle} description={emptyDescription} />}

      {status === "ready" && (
        <div className="scrollbar-none flex gap-3 overflow-x-auto px-1 py-1 md:gap-4">{children}</div>
      )}
    </section>
  );
};

export default Section;
