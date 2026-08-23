export const SkeletonCard = () => (
  <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#161616]">
    <div className="skeleton aspect-square w-full" />
    <div className="space-y-2 px-3 py-3">
      <div className="skeleton h-3 w-3/4 rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
    <div className="skeleton h-11 w-11 shrink-0 rounded-lg" />
    <div className="flex-1 space-y-2">
      <div className="skeleton h-3 w-2/5 rounded" />
      <div className="skeleton h-2.5 w-1/4 rounded" />
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 6 }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonList = ({ count = 5 }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
);
