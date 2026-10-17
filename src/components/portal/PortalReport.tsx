"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import FeasibilityReportView from "@/components/report/FeasibilityReportView";
import { generateADUReport } from "@/lib/adu-analysis";
import { buildDashboardPropertySlim } from "@/lib/dashboard-normalize";
import { buildFeasibilityTableRow } from "@/lib/feasibility-table-model";
import type { FeasibilityResult } from "@/lib/feasibility";

/** A buyer's paid report in the portal: the same report view as the admin tool, opened in full (no paywall). */
export default function PortalReport({ data, error, kind }: { data: FeasibilityResult | null; error: string | null; kind: string }) {
  const router = useRouter();
  const built = useMemo(() => {
    if (!data || (!data.parcel && !data.feasibility)) return null;
    const report = generateADUReport(data.parcel, data.feasibility);
    return { slim: buildDashboardPropertySlim(data, report), row: buildFeasibilityTableRow(data, report) };
  }, [data]);
  if (!built) {
    return (
      <div className="pa-raised mx-auto max-w-[640px] p-6" role="alert">
        <p style={{ color: "var(--ink)", fontWeight: 700 }}>We could not draw this report right now.</p>
        <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>{error ?? "The city's data did not come back. Try again in a few minutes."}</p>
      </div>
    );
  }
  return (
    <div className="pencil-app" style={{ background: "transparent" }}>
      <FeasibilityReportView
        slim={built.slim}
        detailRow={built.row}
        loading={false}
        error={null}
        favorite={false}
        onToggleFavorite={() => {}}
        onBack={() => router.push("/portal/reports")}
        owned={kind.startsWith("feasibility") ? (kind as "feasibility_instant" | "feasibility_reviewed") : undefined}
      />
    </div>
  );
}
