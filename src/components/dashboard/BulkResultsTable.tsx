"use client";

import { Fragment, memo, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DashboardPropertySlim, ConfidenceBand } from "@/lib/dashboard-normalize";
import type { SortKey } from "@/lib/dashboard-query";
import { FavoriteToggle } from "@/components/dashboard/FavoriteToggle";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { daduScoreClass } from "@/lib/metric-health";

function confidenceChipClasses(band: ConfidenceBand): string {
  switch (band) {
    case "strong":
      return "border border-emerald-200 bg-emerald-50 text-emerald-900";
    case "medium":
      return "border border-amber-200 bg-amber-50 text-amber-900";
    case "needs_review":
      return "border border-violet-200 bg-violet-50 text-violet-900";
    default:
      return "border border-zinc-300 bg-zinc-100 text-zinc-800";
  }
}

function scoreClass(score: number): string {
  const tone = daduScoreClass(score);
  if (score >= 72) return `text-lg font-semibold tabular-nums ${tone}`;
  if (score >= 48) return `font-semibold tabular-nums ${tone}`;
  return `font-semibold tabular-nums ${tone}`;
}

interface HeadButtonProps {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}

function SortHead({ label, sortKey, activeKey, dir, onSort }: HeadButtonProps) {
  const active = activeKey === sortKey;
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1 text-left font-medium uppercase tracking-wide hover:text-zinc-900 ${
        active ? "text-zinc-900" : "text-zinc-500"
      }`}
      onClick={() => onSort(sortKey)}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      {label}
      {active ? <span className="sr-only">({dir === "asc" ? "ascending" : "descending"})</span> : null}
      <span className="tabular-nums text-[10px] text-zinc-400" aria-hidden>
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export interface BulkResultsTableProps {
  rows: DashboardPropertySlim[];
  expandedRowId: string | null;
  onToggleExpand: (rowId: string) => void;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  loading?: boolean;
  renderExpanded: (row: DashboardPropertySlim) => React.ReactNode;
}

const MemoRow = memo(function MemoRow({
  row,
  open,
  onToggle,
  renderExpanded,
}: {
  row: DashboardPropertySlim;
  open: boolean;
  onToggle: () => void;
  renderExpanded: (row: DashboardPropertySlim) => React.ReactNode;
}) {
  const analyzed = row.status === "analyzed";
  const rowBg = open ? "bg-zinc-50" : "bg-white";
  const rowBgHover = open ? "group-hover:bg-zinc-50" : "group-hover:bg-zinc-50/80";
  return (
    <Fragment>
      <tr className="group border-b border-zinc-100/90 transition-colors hover:bg-zinc-50/80">
        <td
          className={`sticky left-0 z-[1] w-10 border-r border-zinc-100/80 py-1.5 pl-2 pr-0 align-middle ${rowBg} ${rowBgHover}`}
        >
          <FavoriteToggle address={row.address} />
        </td>
        <td
          className={`sticky left-10 z-[1] w-10 border-r border-zinc-100/80 py-1.5 align-middle ${rowBg} ${rowBgHover}`}
        >
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)]"
            aria-expanded={open}
            aria-label={open ? "Collapse details" : "Expand details"}
          >
            {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
          </button>
        </td>
        <td
          className={`sticky left-[80px] z-[1] min-w-[220px] max-w-[320px] border-r border-zinc-100/80 py-2 pl-1 pr-3 align-top shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)] ${rowBg} ${rowBgHover}`}
        >
          <span className="block font-medium leading-snug text-zinc-900">{row.streetLine}</span>
          <span className="mt-0.5 block text-xs text-zinc-500 line-clamp-2">{row.address}</span>
        </td>
        <td className="min-w-[120px] whitespace-nowrap py-2 pr-3 align-top text-sm text-zinc-700">
          {row.neighborhood}
        </td>
        <td className="whitespace-nowrap py-2 pr-3 align-top text-sm tabular-nums text-zinc-700">
          {row.bedsDisplay} / {row.bathsDisplay}
        </td>
        <td className="whitespace-nowrap py-2 pr-3 align-top text-sm tabular-nums text-zinc-700">
          {row.interiorSqftDisplay}
        </td>
        <td className="min-w-[90px] whitespace-nowrap py-2 pr-3 align-top text-sm tabular-nums text-zinc-700">
          {row.lotSizeSqft != null ? `${row.lotSizeSqft.toLocaleString()} sf` : "—"}
        </td>
        <td className="min-w-[72px] max-w-[100px] py-2 pr-3 align-top text-sm text-zinc-700">
          <span className="line-clamp-2">{row.zoning ?? "—"}</span>
        </td>
        <td className="whitespace-nowrap py-2 pr-3 align-top">
          {analyzed ? <span className={scoreClass(row.daduScore)}>{row.daduScore}</span> : "—"}
        </td>
        <td className="min-w-[100px] py-2 pr-3 align-top">
          <span
            className={`inline-flex max-w-full rounded-md px-2 py-0.5 text-xs font-medium ${confidenceChipClasses(row.confidenceBand)}`}
          >
            {row.confidenceShort}
          </span>
        </td>
        <td className="min-w-[180px] max-w-[260px] py-2 pr-3 align-top text-sm leading-snug text-zinc-600">
          <span className="line-clamp-2">{row.keyInsight}</span>
        </td>
        <td className="min-w-[88px] whitespace-nowrap py-2 pr-3 align-top">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
              analyzed
                ? "border border-zinc-200 bg-white text-zinc-800"
                : "border border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {analyzed ? "Analyzed" : "Failed"}
          </span>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-zinc-200/80 bg-zinc-50/30">
          <td colSpan={12} className="p-0 align-top">
            {renderExpanded(row)}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
});

export function BulkResultsTable({
  rows,
  expandedRowId,
  onToggleExpand,
  sortKey,
  sortDir,
  onSort,
  loading,
  renderExpanded,
}: BulkResultsTableProps) {
  const handleSort = useCallback(
    (key: SortKey) => {
      onSort(key);
    },
    [onSort]
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-12 text-center text-sm text-zinc-500">
        Loading analysis…
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
        <thead className="sticky top-0 z-20 border-b border-zinc-200/90 bg-white shadow-[0_1px_0_0_rgba(9,9,11,0.06)]">
          <tr className="text-xs text-zinc-500">
            <th scope="col" className="sticky left-0 z-30 whitespace-nowrap bg-white py-3 pl-2 pr-0">
              <span className="sr-only">Favorite</span>
            </th>
            <th scope="col" className="sticky left-10 z-30 whitespace-nowrap bg-white py-3 pr-0">
              <span className="sr-only">Expand</span>
            </th>
            <th
              scope="col"
              className="sticky left-[80px] z-30 min-w-[220px] border-r border-zinc-100/80 bg-white py-3 pr-3 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.08)]"
            >
              <SortHead label="Address" sortKey="address" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Area" sortKey="neighborhood" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Br/Ba" sortKey="beds" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Interior" sortKey="interior" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Lot" sortKey="lot" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Zone" sortKey="zoning" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Score" sortKey="score" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Confidence" sortKey="confidence" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th scope="col" className="min-w-[160px] py-3 pr-3 font-medium uppercase tracking-wide text-zinc-500">
              Insight
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pr-3">
              <SortHead label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <MemoRow
              key={r.id}
              row={r}
              open={expandedRowId === r.id}
              onToggle={() => onToggleExpand(r.id)}
              renderExpanded={renderExpanded}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
