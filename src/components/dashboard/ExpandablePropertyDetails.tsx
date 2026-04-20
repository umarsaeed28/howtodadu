"use client";

import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { FeasibilityRowDetailPanel } from "@/components/feasibility-tool/FeasibilityRowDetailPanel";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { ErrorState } from "@/components/dashboard/ErrorState";

interface ExpandablePropertyDetailsProps {
  slim: DashboardPropertySlim;
  /** Full row when analysis succeeded and detail was loaded */
  detailRow: FeasibilityTableRow | null;
  loading: boolean;
  error: string | null;
}

export function ExpandablePropertyDetails({
  slim,
  detailRow,
  loading,
  error,
}: ExpandablePropertyDetailsProps) {
  if (slim.status === "failed") {
    return (
      <div className="border-t border-zinc-200/80 bg-zinc-50/50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Analysis unavailable</h3>
          <p className="text-sm text-zinc-800">{slim.errorMessage ?? slim.summarySentence}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border-t border-zinc-200/80 bg-zinc-50/50 px-4 py-6">
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-zinc-200/80 bg-zinc-50/50 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <ErrorState message={error} />
        </div>
      </div>
    );
  }

  if (!detailRow) {
    return null;
  }

  return <FeasibilityRowDetailPanel row={detailRow} />;
}
