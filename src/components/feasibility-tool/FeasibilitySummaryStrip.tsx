"use client";

interface FeasibilitySummaryStripProps {
  totalRows: number;
  visibleRows: number;
  averageScore: number | null;
  strongPotentialCount: number;
  favoritesOnly: boolean;
}

export function FeasibilitySummaryStrip({
  totalRows,
  visibleRows,
  averageScore,
  strongPotentialCount,
  favoritesOnly,
}: FeasibilitySummaryStripProps) {
  return (
    <div
      className="grid grid-cols-2 gap-4 border-b border-zinc-200/90 py-4 sm:grid-cols-4"
      role="region"
      aria-label="Results summary"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">In view</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
          {visibleRows}
          <span className="text-sm font-normal text-zinc-500">
            {" "}
            / {totalRows}
          </span>
        </p>
        {favoritesOnly ? (
          <p className="mt-0.5 text-xs text-zinc-500">Favorites only</p>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Avg DADU score</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
          {averageScore != null ? averageScore : "—"}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Strong potential</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{strongPotentialCount}</p>
      </div>
      <div className="min-w-0 hidden sm:block">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tip</p>
        <p className="mt-1 text-sm leading-snug text-zinc-600">
          Expand a row for verdict, site facts, and risks—without raw GIS codes.
        </p>
      </div>
    </div>
  );
}
