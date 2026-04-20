"use client";

interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  disabled,
}: TablePaginationProps) {
  const start = totalItems === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200/80 bg-zinc-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-zinc-600">
        Showing{" "}
        <span className="font-medium tabular-nums text-zinc-900">
          {start}-{end}
        </span>{" "}
        of <span className="font-medium tabular-nums">{totalItems}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          Rows per page
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            disabled={disabled || page <= 0}
            onClick={() => onPageChange(page - 1)}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800 disabled:opacity-40 hover:border-zinc-300"
          >
            Previous
          </button>
          <span className="px-2 text-xs text-zinc-600 tabular-nums">
            Page {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={disabled || page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800 disabled:opacity-40 hover:border-zinc-300"
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}
