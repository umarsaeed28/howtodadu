"use client";

export type FeasibilitySort = "score_desc" | "score_asc" | "address_asc";

interface FeasibilityFilterBarProps {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  sort: FeasibilitySort;
  onSortChange: (v: FeasibilitySort) => void;
  onShareClick?: () => void;
  disabled?: boolean;
}

export function FeasibilityFilterBar({
  searchQuery,
  onSearchQueryChange,
  sort,
  onSortChange,
  onShareClick,
  disabled,
}: FeasibilityFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-200/90 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor="feasibility-filter-table" className="text-xs font-medium text-zinc-500">
          Filter results
        </label>
        <input
          id="feasibility-filter-table"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search address or zoning…"
          disabled={disabled}
          className="h-10 w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[var(--feasibility-accent,#0d9488)] focus:outline-none focus:ring-2 focus:ring-[var(--feasibility-accent,#0d9488)]/20 disabled:opacity-50"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="feasibility-sort" className="text-xs font-medium text-zinc-500">
            Sort
          </label>
          <select
            id="feasibility-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as FeasibilitySort)}
            disabled={disabled}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-[var(--feasibility-accent,#0d9488)] focus:outline-none focus:ring-2 focus:ring-[var(--feasibility-accent,#0d9488)]/20 disabled:opacity-50"
          >
            <option value="score_desc">DADU score · high to low</option>
            <option value="score_asc">DADU score · low to high</option>
            <option value="address_asc">Address · A–Z</option>
          </select>
        </div>
        {onShareClick ? (
          <button
            type="button"
            onClick={onShareClick}
            className="mt-6 h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:border-[var(--feasibility-accent,#0d9488)] hover:text-[var(--feasibility-accent,#0d9488)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)] sm:mt-0"
          >
            Share
          </button>
        ) : null}
      </div>
    </div>
  );
}
