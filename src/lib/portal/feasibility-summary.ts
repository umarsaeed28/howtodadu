import type { FeasibilityResult } from "@/lib/feasibility";
import { generateADUReport, type ADUReport } from "@/lib/adu-analysis";
import { buildFeasibilityTableRow, type FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { toReport } from "@/lib/report/to-report";
import { daduEconomics } from "@/lib/dadu-value";
import { BUILD_TYPES } from "@/lib/feasibility/defaults";
import type { FeasibilityReport } from "../../../packages/schema/src";

/** The numbers the portal keeps from a feasibility run: enough for the card, the stage and the metrics. */
export type FeasibilitySummary = {
  pin: string | null;
  score: number;
  verdict: string;
  headline: string;
  maxDaduSf: number | null;
  buildableAreaSf: number | null;
  lotSqft: number | null;
  zoning: string | null;
  coveragePct: number | null;
  maxCoveragePct: number | null;
  heightFt: number | null;
  rearSetbackFt: number | null;
  sideSetbackFt: number | null;
  /** Seattle requires no off-street parking for a DADU (SMC 23.54.015), so this is text, not a number. */
  parking: string;
  costUsd: number | null;
  rentMonthly: number | null;
  saleValueUsd: number | null;
};

/** Runs the engine's pure steps on a result: the ADU report, the table row and the shared report shape. */
export function deriveReport(data: FeasibilityResult): { adu: ADUReport; row: FeasibilityTableRow; report: FeasibilityReport } {
  const adu = generateADUReport(data.parcel, data.feasibility);
  const row = buildFeasibilityTableRow(data, adu);
  return { adu, row, report: toReport(row) };
}

export function summarizeFeasibility(data: FeasibilityResult): FeasibilitySummary {
  const { adu, report } = deriveReport(data);
  const s = report.summary;
  const maxDaduSf = s.max_buildable_sf?.value ?? null;
  const econ = daduEconomics(maxDaduSf);
  return {
    pin: data.parcel?.pin ?? null,
    score: Math.round(s.score.value),
    verdict: s.verdict,
    headline: s.headline,
    maxDaduSf: maxDaduSf == null ? null : Math.round(maxDaduSf),
    buildableAreaSf: adu.coverage ? Math.round(adu.coverage.availableSqft) : null,
    lotSqft: data.parcel?.lotSqft ?? null,
    zoning: data.parcel?.zoning ?? null,
    coveragePct: adu.coverage ? Math.round(adu.coverage.currentPercent) : null,
    maxCoveragePct: adu.coverage ? Math.round(adu.coverage.maxPercent) : null,
    heightFt: adu.daduFootprint?.maxHeight ?? adu.height?.total ?? null,
    rearSetbackFt: adu.daduFootprint?.rearSetback ?? null,
    sideSetbackFt: adu.daduFootprint?.sideSetback ?? null,
    parking: "None required for a DADU in Seattle",
    costUsd: s.construction_cost_usd?.value ?? (econ ? econ.allInCost : null),
    rentMonthly: maxDaduSf ? BUILD_TYPES.sfr_dadu.rentPerUnitMonthly : null,
    saleValueUsd: econ ? Math.round(econ.saleValue) : null,
  };
}
