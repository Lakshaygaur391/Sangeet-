import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { SkeletonCard } from "./ui/Skeleton";
import { EmptyState } from "./ui/StatePanels";
import { InlineError } from "./ui/StatePanels";

// Modular silky-smooth horizontal-scroll section used across Home / Discover / Library.
// Supports:
// 1. Mouse-wheel to horizontal smooth scrolling
// 2. Mouse click-and-drag smooth panning with click suppression
// 3. Header and overlay floating paging buttons
// 4. Smooth touch & trackpad momentum
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
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Drag-to-scroll state
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, children, status]);

  // Smooth mouse-wheel translation: scrolling vertically while hovering scrolls horizontally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return; // Native trackpad horizontal scroll
      }
      if (e.deltaY === 0) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= maxScroll && e.deltaY > 0;

      // If there is room to scroll horizontally inside this container, scroll smoothly
      if (!atStart && !atEnd && maxScroll > 0) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 1.5,
          behavior: "smooth",
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleScroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(300, el.clientWidth * 0.8);
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Mouse Drag-to-Scroll handlers
  const handleMouseDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDownRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.4;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = startScrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  // Suppress accidental click/play when user was dragging
  const handleClickCapture = (e) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return (
    <section
      id={id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUpOrLeave();
      }}
      className="group/section relative scroll-mt-24 rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-lg shadow-black/20 md:p-5"
    >
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          {eyebrow && <p className="text-meta mb-1 text-amber-300/80">{eyebrow}</p>}
          <h2 className="text-h2 text-white">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {seeAllHref && status === "ready" && (
            <Link to={seeAllHref} className="text-caption mr-2 shrink-0 font-semibold text-amber-300 hover:text-amber-200">
              See all
            </Link>
          )}

          {status === "ready" && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 shadow-sm transition hover:bg-amber-400/20 hover:border-amber-400/40 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-20"
              >
                <IoChevronBack className="text-base" />
              </button>
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 shadow-sm transition hover:bg-amber-400/20 hover:border-amber-400/40 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-20"
              >
                <IoChevronForward className="text-base" />
              </button>
            </div>
          )}
        </div>
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
        <div className="relative">
          {/* Subtle Left Fade + Overlay Button */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-16 bg-gradient-to-r from-[#141414] via-[#141414]/70 to-transparent sm:flex sm:items-center">
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => handleScroll("left")}
                className="pointer-events-auto -ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-amber-400 hover:text-black"
              >
                <IoChevronBack className="text-lg" />
              </button>
            </div>
          )}

          {/* Horizontal Scroll Track */}
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onClickCapture={handleClickCapture}
            className="scrollbar-none smooth-horizontal-scroll flex cursor-grab gap-3 overflow-x-auto px-1 py-2 active:cursor-grabbing md:gap-4"
          >
            {children}
          </div>

          {/* Subtle Right Fade + Overlay Button */}
          {canScrollRight && (
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-16 justify-end bg-gradient-to-l from-[#141414] via-[#141414]/70 to-transparent sm:flex sm:items-center">
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => handleScroll("right")}
                className="pointer-events-auto -mr-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white shadow-xl backdrop-blur-md transition hover:scale-110 hover:bg-amber-400 hover:text-black"
              >
                <IoChevronForward className="text-lg" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default Section;
