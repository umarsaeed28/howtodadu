"use client";

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white" aria-busy="true" aria-label="Loading table">
      <div className="border-b border-zinc-100 bg-zinc-50/80 p-3">
        <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
      </div>
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <div className="h-4 w-8 shrink-0 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 min-w-0 flex-1 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-14 shrink-0 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
