"use client";

import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { FavoriteStarButton } from "./FavoriteStarButton";
import { FeasibilityRowDetailPanel } from "./FeasibilityRowDetailPanel";

interface FeasibilityResultsTableProps {
  rows: FeasibilityTableRow[];
  expandedRowId: string | null;
  onToggleExpand: (rowId: string) => void;
  loading?: boolean;
}

function scoreWeight(score: number): string {
  if (score >= 72) return "font-semibold text-zinc-900";
  if (score >= 48) return "font-medium text-zinc-800";
  return "font-medium text-zinc-600";
}

export function FeasibilityResultsTable({
  rows,
  expandedRowId,
  onToggleExpand,
  loading,
}: FeasibilityResultsTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200/80 bg-white px-4 py-12 text-center text-sm text-zinc-500">
        Loading feasibility…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-16 text-center"
        role="status"
      >
        <p className="text-sm font-medium text-zinc-800">No properties in this view</p>
        <p className="mt-2 text-sm text-zinc-600">
          Search an address above to add a row, or switch to all results.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200/80 bg-white">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200/90 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <th className="w-10 py-3 pl-3 pr-1" scope="col">
              <span className="sr-only">Favorite</span>
            </th>
            <th className="w-8 py-3 pr-1" scope="col">
              <span className="sr-only">Expand</span>
            </th>
            <th className="min-w-[180px] py-3 pr-3 font-medium" scope="col">
              Address
            </th>
            <th className="whitespace-nowrap py-3 pr-3 font-medium" scope="col">
              Assessed value
            </th>
            <th className="whitespace-nowrap py-3 pr-3 font-medium" scope="col">
              Beds / baths
            </th>
            <th className="whitespace-nowrap py-3 pr-3 font-medium" scope="col">
              Lot size
            </th>
            <th className="min-w-[100px] py-3 pr-3 font-medium" scope="col">
              Zoning
            </th>
            <th className="whitespace-nowrap py-3 pr-3 font-medium" scope="col">
              DADU score
            </th>
            <th className="whitespace-nowrap py-3 pr-3 font-medium" scope="col">
              Confidence
            </th>
            <th className="min-w-[120px] py-3 pr-3 font-medium" scope="col">
              Urban village
            </th>
            <th className="min-w-[200px] py-3 pr-3 font-medium" scope="col">
              Key insight
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = expandedRowId === row.id;
            return (
              <Fragment key={row.id}>
                <tr
                  className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/80"
                >
                  <td className="py-2 pl-3 align-middle">
                    <FavoriteStarButton address={row.address} />
                  </td>
                  <td className="py-2 align-middle">
                    <button
                      type="button"
                      onClick={() => onToggleExpand(row.id)}
                      className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)]"
                      aria-expanded={open}
                      aria-controls={`detail-${row.id}`}
                      id={`expand-${row.id}`}
                      aria-label={open ? `Collapse details for ${row.streetLine}` : `Expand details for ${row.streetLine}`}
                    >
                      {open ? (
                        <ChevronDown className="size-4" aria-hidden />
                      ) : (
                        <ChevronRight className="size-4" aria-hidden />
                      )}
                    </button>
                  </td>
                  <td className="py-2 pr-3 align-middle">
                    <button
                      type="button"
                      onClick={() => onToggleExpand(row.id)}
                      className="text-left font-medium text-zinc-900 hover:text-[var(--feasibility-accent,#0d9488)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--feasibility-accent,#0d9488)]"
                      aria-expanded={open}
                      aria-controls={`detail-${row.id}`}
                    >
                      {row.streetLine}
                    </button>
                    <span className="sr-only">. {row.verdictLabel}.</span>
                  </td>
                  <td className="py-2 pr-3 align-middle tabular-nums text-zinc-700">{row.priceDisplay}</td>
                  <td className="py-2 pr-3 align-middle tabular-nums text-zinc-600">
                    {row.bedsDisplay} / {row.bathsDisplay}
                  </td>
                  <td className="py-2 pr-3 align-middle tabular-nums text-zinc-700">
                    {row.lotSizeSqft != null ? row.lotSizeSqft.toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-3 align-middle text-zinc-700">{row.zoning ?? "—"}</td>
                  <td className={`py-2 pr-3 align-middle tabular-nums ${scoreWeight(row.daduScore)}`}>
                    {row.daduScore}
                  </td>
                  <td className="py-2 pr-3 align-middle text-zinc-700">{row.confidenceShort}</td>
                  <td className="py-2 pr-3 align-middle text-zinc-600">{row.uwProximity}</td>
                  <td className="py-2 pr-3 align-middle text-zinc-600">
                    <span className="line-clamp-2 leading-snug">{row.keyInsight}</span>
                  </td>
                </tr>
                {open ? (
                  <tr key={`${row.id}-detail`} className="border-b border-zinc-100 bg-zinc-50/30">
                    <td colSpan={11} className="p-0" id={`detail-${row.id}`} role="region" aria-labelledby={`expand-${row.id}`}>
                      <FeasibilityRowDetailPanel row={row} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
        Assessed value is from county records, not list price. Beds and baths are not in city GIS.
      </p>
    </div>
  );
}
