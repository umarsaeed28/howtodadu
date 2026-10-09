/**
 * Deterministic risk flags. No model, no judgement calls beyond the thresholds named here, each with its source.
 */
import claims from "../../../content/claims.json";
import type { ProformaInputs } from "./schema";
import type { Metrics } from "./metrics";
import { requiredMissing } from "./schema";

export interface RiskFlag {
  key: string;
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  source: string | null;
}

const sdci = claims.claims.find((c) => c.id === "sdci_dadu_permit_time")!;
const TYPICAL_PERMIT_MONTHS = (sdci.value as { typicalMonths: number }).typicalMonths;
export const MIN_CONTINGENCY_PCT = 5;

export function riskFlags(i: ProformaInputs, m: Metrics): RiskFlag[] {
  const out: RiskFlag[] = [];
  const missing = requiredMissing(i);
  if (missing.length) out.push({ key: "incomplete", severity: "high", title: "Inputs missing", detail: `Enter ${missing.map((x) => x.label.toLowerCase()).join(", ")} before relying on these numbers.`, source: null });
  if (m.dscrYear1 != null && m.dscrYear1 < i.financing.perm.minDscr) out.push({ key: "dscr", severity: "high", title: `DSCR ${m.dscrYear1.toFixed(2)}x is under the ${i.financing.perm.minDscr.toFixed(2)}x minimum`, detail: "The stabilized year's NOI does not cover debt service by the lender's margin.", source: null });
  if (m.yieldOnCost != null && i.financing.mode === "construction_loan" && i.meta.strategy !== "sell" && i.financing.perm.ratePct / 100 > m.yieldOnCost) out.push({ key: "negative_leverage", severity: "medium", title: "Negative leverage", detail: `The permanent loan rate (${i.financing.perm.ratePct}%) is above the yield on cost (${(m.yieldOnCost * 100).toFixed(2)}%): borrowing lowers the return.`, source: null });
  if (i.budget.hardContPct < MIN_CONTINGENCY_PCT) out.push({ key: "contingency", severity: "medium", title: `Hard cost contingency is ${i.budget.hardContPct}%`, detail: `Under ${MIN_CONTINGENCY_PCT}%: little room for the surprises a build brings.`, source: null });
  if (i.timeline.permitMo < TYPICAL_PERMIT_MONTHS) out.push({ key: "permit_time", severity: "medium", title: `${i.timeline.permitMo} permit months is shorter than typical`, detail: `SDCI's 75th-percentile time in City control for a pre-approved DADU is ${(sdci.value as { cityControlDays75th: number }).cityControlDays75th} days, and the applicant's elapsed time is about twice that: about ${TYPICAL_PERMIT_MONTHS} months. Custom designs take longer.`, source: sdci.source });
  if (m.yieldOnCost != null && m.exitCap != null && m.yieldOnCost < m.exitCap) out.push({ key: "spread", severity: "high", title: "Yield on cost is below the exit cap rate", detail: `${(m.yieldOnCost * 100).toFixed(2)}% on cost against a ${(m.exitCap * 100).toFixed(2)}% exit cap: the building is worth less than it costs on these numbers.`, source: null });
  return out;
}
