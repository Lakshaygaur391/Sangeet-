import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  IoSearchOutline,
  IoClose,
  IoFilterOutline,
  IoChevronDown,
  IoCheckmark,
  IoCalendarOutline,
  IoLanguageOutline,
  IoSwapVerticalOutline,
} from "react-icons/io5";

const SORT_OPTIONS = [
  { key: "default", label: "Default Order" },
  { key: "title_asc", label: "Title (A → Z)" },
  { key: "title_desc", label: "Title (Z → A)" },
  { key: "artist_asc", label: "Artist (A → Z)" },
  { key: "artist_desc", label: "Artist (Z → A)" },
  { key: "duration_asc", label: "Shortest First" },
  { key: "duration_desc", label: "Longest First" },
];

/** Generic dropdown component */
const FilterDropdown = ({ icon: Icon, label, value, isActive, open, onToggle, children }) => (
  <div className="relative">
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-150 ${
        isActive
          ? "border-amber-400/50 bg-amber-400/10 text-amber-200 shadow-sm shadow-amber-400/10"
          : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white hover:border-white/20"
      }`}
    >
      {Icon && <Icon className="text-xs shrink-0" />}
      <span className="max-w-[96px] truncate">{value || label}</span>
      <IoChevronDown
        className={`text-[10px] shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      />
    </button>

    {open && (
      <div className="animate-scale-in absolute left-0 top-10 z-40 max-h-60 min-w-[160px] overflow-y-auto rounded-xl border border-white/10 bg-[#1c1c1e] py-1.5 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {children}
      </div>
    )}
  </div>
);

/** A single option row inside a dropdown */
const DropdownOption = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs font-medium transition-colors ${
      selected
        ? "text-amber-300 bg-amber-400/[0.07]"
        : "text-white/75 hover:bg-white/[0.08] hover:text-white"
    }`}
  >
    <span className="truncate">{label}</span>
    {selected && <IoCheckmark className="text-amber-400 shrink-0 ml-2" />}
  </button>
);

/** Active filter chip */
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 pl-2.5 pr-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
    {label}
    <button
      type="button"
      aria-label={`Remove filter: ${label}`}
      onClick={onRemove}
      className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400/20 hover:bg-amber-400/40 transition-colors"
    >
      <IoClose className="text-[9px]" />
    </button>
  </span>
);

const PlaylistFilters = ({
  searchQuery,
  onSearchChange,
  selectedLanguage,
  onLanguageChange,
  availableLanguages = [],
  selectedYear,
  onYearChange,
  availableYears = [],
  selectedSort,
  onSortChange,
  totalCount,
  filteredCount,
  onClearAll,
}) => {
  const [langOpen, setLangOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const langRef = useRef(null);
  const yearRef = useRef(null);
  const sortRef = useRef(null);

  // Close all dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!langRef.current?.contains(e.target)) setLangOpen(false);
      if (!yearRef.current?.contains(e.target)) setYearOpen(false);
      if (!sortRef.current?.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile sheet on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    (selectedLanguage && selectedLanguage !== "all") ||
    (selectedYear && selectedYear !== "all") ||
    (selectedSort && selectedSort !== "default")
  );

  const activeSortLabel = useMemo(
    () => SORT_OPTIONS.find((s) => s.key === selectedSort)?.label || "Sort",
    [selectedSort]
  );

  const activeFilterCount = [
    selectedLanguage && selectedLanguage !== "all",
    selectedYear && selectedYear !== "all",
    selectedSort && selectedSort !== "default",
  ].filter(Boolean).length;

  const closeAll = useCallback(() => {
    setLangOpen(false);
    setYearOpen(false);
    setSortOpen(false);
  }, []);

  // Desktop filter controls shared logic
  const desktopFilters = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Language dropdown */}
      {availableLanguages.length > 1 && (
        <div ref={langRef}>
          <FilterDropdown
            icon={IoLanguageOutline}
            label="Language"
            value={selectedLanguage !== "all" ? selectedLanguage : ""}
            isActive={selectedLanguage !== "all"}
            open={langOpen}
            onToggle={() => { closeAll(); setLangOpen((v) => !v); }}
          >
            <DropdownOption
              label="All Languages"
              selected={selectedLanguage === "all"}
              onClick={() => { onLanguageChange("all"); setLangOpen(false); }}
            />
            {availableLanguages.map((lang) => (
              <DropdownOption
                key={lang}
                label={lang}
                selected={selectedLanguage === lang}
                onClick={() => { onLanguageChange(lang); setLangOpen(false); }}
              />
            ))}
          </FilterDropdown>
        </div>
      )}

      {/* Year dropdown */}
      {availableYears.length > 1 && (
        <div ref={yearRef}>
          <FilterDropdown
            icon={IoCalendarOutline}
            label="Year"
            value={selectedYear && selectedYear !== "all" ? selectedYear : ""}
            isActive={selectedYear && selectedYear !== "all"}
            open={yearOpen}
            onToggle={() => { closeAll(); setYearOpen((v) => !v); }}
          >
            <DropdownOption
              label="All Years"
              selected={!selectedYear || selectedYear === "all"}
              onClick={() => { onYearChange("all"); setYearOpen(false); }}
            />
            {availableYears.map((yr) => (
              <DropdownOption
                key={yr}
                label={String(yr)}
                selected={String(selectedYear) === String(yr)}
                onClick={() => { onYearChange(String(yr)); setYearOpen(false); }}
              />
            ))}
          </FilterDropdown>
        </div>
      )}

      {/* Sort dropdown */}
      <div ref={sortRef}>
        <FilterDropdown
          icon={IoSwapVerticalOutline}
          label="Sort"
          value={selectedSort !== "default" ? activeSortLabel : ""}
          isActive={selectedSort !== "default"}
          open={sortOpen}
          onToggle={() => { closeAll(); setSortOpen((v) => !v); }}
        >
          {SORT_OPTIONS.map((opt) => (
            <DropdownOption
              key={opt.key}
              label={opt.label}
              selected={selectedSort === opt.key}
              onClick={() => { onSortChange(opt.key); setSortOpen(false); }}
            />
          ))}
        </FilterDropdown>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-300/80 transition hover:bg-rose-500/10 hover:text-rose-300"
        >
          <IoClose className="text-sm" /> Clear
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-2.5 animate-fade-in">
      {/* ── Search bar + desktop filters ── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#141415] px-3.5 py-2.5 text-sm transition-all duration-150 focus-within:border-amber-400/40 focus-within:ring-1 focus-within:ring-amber-400/15 focus-within:bg-[#171719]">
            <IoSearchOutline className="text-base text-white/35 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search in this playlist…"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/40 hover:bg-white/20 hover:text-white transition-colors shrink-0"
              >
                <IoClose className="text-[11px]" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop: full dropdowns */}
        <div className="hidden sm:flex">{desktopFilters}</div>

        {/* Mobile: compact filter button */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={`flex sm:hidden items-center gap-1.5 self-start rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
            activeFilterCount > 0
              ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
              : "border-white/10 bg-white/[0.04] text-white/60"
          }`}
        >
          <IoFilterOutline className="text-sm" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Active filter chips row ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 animate-fade-in-up">
          {searchQuery.trim() && (
            <FilterChip
              label={`"${searchQuery.trim()}"`}
              onRemove={() => onSearchChange("")}
            />
          )}
          {selectedLanguage && selectedLanguage !== "all" && (
            <FilterChip
              label={selectedLanguage}
              onRemove={() => onLanguageChange("all")}
            />
          )}
          {selectedYear && selectedYear !== "all" && (
            <FilterChip
              label={selectedYear}
              onRemove={() => onYearChange("all")}
            />
          )}
          {selectedSort !== "default" && (
            <FilterChip
              label={activeSortLabel}
              onRemove={() => onSortChange("default")}
            />
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-semibold text-white/35 hover:text-rose-300 transition-colors ml-0.5"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Result count ── */}
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-xs text-white/40">
          {hasActiveFilters ? (
            <>
              Showing <strong className="text-white/70 font-semibold">{filteredCount}</strong>{" "}
              of <span className="text-white/55">{totalCount}</span> songs
            </>
          ) : (
            <span className="text-white/35">{totalCount} {totalCount === 1 ? "song" : "songs"}</span>
          )}
        </span>
      </div>

      {/* ══ Mobile Bottom Sheet ══ */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="bottom-sheet-overlay animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="bottom-sheet-panel animate-bottom-sheet-in" role="dialog" aria-label="Filter options">
            <div className="bottom-sheet-handle" />

            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-sm font-bold text-white">Filters & Sort</h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { onClearAll(); setMobileOpen(false); }}
                  className="text-xs font-semibold text-rose-300 hover:text-rose-200 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Language section */}
            {availableLanguages.length > 1 && (
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Language
                </p>
                <div className="flex flex-wrap gap-2">
                  {["all", ...availableLanguages].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => onLanguageChange(lang)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        (lang === "all" && (selectedLanguage === "all" || !selectedLanguage))
                        || selectedLanguage === lang
                          ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
                          : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
                      }`}
                    >
                      {lang === "all" ? "All" : lang}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Year section */}
            {availableYears.length > 1 && (
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Year
                </p>
                <div className="flex flex-wrap gap-2">
                  {["all", ...availableYears].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => onYearChange(String(yr))}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        (yr === "all" && (selectedYear === "all" || !selectedYear))
                        || String(selectedYear) === String(yr)
                          ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
                          : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
                      }`}
                    >
                      {yr === "all" ? "All Years" : yr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort section */}
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                Sort by
              </p>
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onSortChange(opt.key)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                      selectedSort === opt.key
                        ? "bg-amber-400/10 text-amber-200 border border-amber-400/25"
                        : "text-white/65 hover:bg-white/[0.06] hover:text-white border border-transparent"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedSort === opt.key && (
                      <IoCheckmark className="text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="w-full rounded-full bg-gradient-to-br from-amber-300 to-amber-500 py-3 text-sm font-bold text-black shadow-lg transition hover:scale-[1.02] active:scale-95"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PlaylistFilters;
