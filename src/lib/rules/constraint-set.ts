import { ADU, NR, PENCIL, nrFarFor, type RuleKind, type RuleStatus } from "./seattle-adu";
import { nrMaxFloorArea } from "@/lib/feasibility/far";
import type { LotFeasibilityInput, SeattleLotFeasibilityOutput } from "@/lib/feasibility/lot-feasibility";
import { canonicalZone } from "@/lib/zoning";

/**
 * A lot's ConstraintSet: every rule in the rulebook applied to one lot, with the lot's own figure next to the limit
 * and the citation that sets it. What the admin panel shows; computed, never typed by hand.
 */

export type ConstraintStatus = "pass" | "fail" | "info" | "unknown";

export interface Constraint {
  id: string;
  label: string;
  /** The limit, in words: "50 percent of the lot, 2,000 sq ft". */
  limit: string;
  /** This lot against it: "700 used, 1,300 left". Null when the rule needs no lot figure. */
  lot: string | null;
  status: ConstraintStatus;
  kind: RuleKind;
  /** Code section for a code rule; null for Pencil's own rules. */
  citation: string | null;
  verified: boolean;
}

export interface ConstraintLot extends LotFeasibilityInput {
  zoning: string | null;
}

const sf = (n: number) => `${Math.round(n).toLocaleString("en-US")} sq ft`;
const cite = (r: { kind: RuleKind; citation?: string; status: RuleStatus }) => ({ kind: r.kind, citation: r.citation ?? null, verified: r.status === "cited" });

export function buildConstraintSet(l: ConstraintLot): Constraint[] {
  const minFoot = PENCIL.minFootprint.value.sqft;
  // The city still labels some lots with pre-2021 names (SF 5000 is NR3): compare the current zone.
  const zone = (canonicalZone(l.zoning) ?? "").replace(/\s+/g, "");
  const units = 1 + Math.max(0, l.existingAdus) + 1; // the house, the ADUs on record, and one new DADU
  const coverageMax = Math.round(NR.maxLotCoverage.value * l.lotSqft);
  const coverageLeft = Math.max(0, coverageMax - l.existingFootprintSqft);
  const far = nrFarFor(l.lotSqft, units);
  const floorMax = nrMaxFloorArea(l.lotSqft, units);
  const floorLeft = Math.max(0, floorMax - l.existingChargeableSqft);
  const adusLeft = Math.max(0, ADU.maxPerLot.value - l.existingAdus);
  const h = NR.height.value;

  return [
    { id: "lot_screen", label: PENCIL.minLotSqft.label, limit: sf(PENCIL.minLotSqft.value), lot: sf(l.lotSqft), status: l.lotSqft >= PENCIL.minLotSqft.value ? "pass" : "fail", ...cite(PENCIL.minLotSqft) },
    { id: "zone", label: PENCIL.buyBoxZones.label, limit: PENCIL.buyBoxZones.value.join(", "), lot: l.zoning ? (canonicalZone(l.zoning) !== l.zoning ? `${l.zoning} (${canonicalZone(l.zoning)})` : l.zoning) : "unknown", status: !zone ? "unknown" : PENCIL.buyBoxZones.value.includes(zone) ? "pass" : "fail", ...cite(PENCIL.buyBoxZones) },
    { id: "adu_count", label: ADU.maxPerLot.label, limit: `${ADU.maxPerLot.value}`, lot: `${l.existingAdus} on record, ${adusLeft} left`, status: adusLeft > 0 ? "pass" : "fail", ...cite(ADU.maxPerLot) },
    { id: "coverage", label: NR.maxLotCoverage.label, limit: `50 percent of the lot, ${sf(coverageMax)}`, lot: `${sf(l.existingFootprintSqft)} used, ${sf(coverageLeft)} left`, status: coverageLeft >= minFoot ? "pass" : "fail", ...cite(NR.maxLotCoverage) },
    { id: "far", label: `${NR.farTable.label} (house + ${l.existingAdus + 1} ADU${l.existingAdus ? "s" : ""})`, limit: `FAR ${far.toFixed(1)}, ${sf(floorMax)}`, lot: `${sf(l.existingChargeableSqft)} used, ${sf(floorLeft)} left`, status: floorLeft >= minFoot ? "pass" : "fail", ...cite(NR.farTable) },
    ...(l.lotSqft < NR.smallLotUnderSqft.value
      ? [{ id: "small_lot", label: NR.smallLotFloorSqft.label, limit: sf(NR.smallLotFloorSqft.value), lot: floorMax === NR.smallLotFloorSqft.value ? "applies" : "FAR gives more", status: "info" as const, ...cite(NR.smallLotFloorSqft) }]
      : []),
    { id: "adu_size", label: ADU.maxGrossSqft.label, limit: sf(ADU.maxGrossSqft.value), lot: null, status: "info", ...cite(ADU.maxGrossSqft) },
    { id: "adu_size_3br", label: ADU.maxGrossSqft3br.label, limit: sf(ADU.maxGrossSqft3br.value), lot: null, status: "info", ...cite(ADU.maxGrossSqft3br) },
    { id: "garage", label: ADU.garageExemptSqft.label, limit: sf(ADU.garageExemptSqft.value), lot: l.garageSqft ? `${sf(l.garageSqft)} planned` : null, status: "info", ...cite(ADU.garageExemptSqft) },
    { id: "height", label: NR.height.label, limit: `${h.base} ft, +${h.pitched} ft pitched roof or +${h.shed} ft shed roof`, lot: null, status: "info", ...cite(NR.height) },
    { id: "rear_setback", label: NR.rearSetbackFt.label, limit: `${NR.rearSetbackFt.value} ft, 0 ft on an alley`, lot: l.hasAlley ? "alley: 0 ft" : `${NR.rearSetbackFt.value} ft`, status: "info", ...cite(NR.rearSetbackFt) },
    { id: "side_setback", label: NR.sideSetbackFt.label, limit: `${NR.sideSetbackFt.value.average} ft average, ${NR.sideSetbackFt.value.minimum} ft minimum`, lot: null, status: "info", ...cite(NR.sideSetbackFt) },
    { id: "front_setback", label: NR.frontSetbackFt.label, limit: `${NR.frontSetbackFt.value} ft`, lot: null, status: "info", ...cite(NR.frontSetbackFt) },
    { id: "separation", label: NR.separationFt.label, limit: `${NR.separationFt.value} ft`, lot: null, status: "info", ...cite(NR.separationFt) },
    { id: "open_spot", label: PENCIL.minFootprint.label, limit: `${sf(minFoot)} (15 x 20 ft)`, lot: l.roomSqft == null ? "not measured" : `${sf(l.roomSqft)} open`, status: l.roomSqft == null ? "unknown" : l.roomSqft >= minFoot ? "pass" : "fail", ...cite(PENCIL.minFootprint) },
    { id: "parking", label: ADU.parkingRequired.label, limit: "none required", lot: null, status: "info", ...cite(ADU.parkingRequired) },
  ];
}

export interface ValidatorReport {
  ok: boolean;
  failures: string[];
  warnings: string[];
  /** Plan options that fit, with their largest floor area per unit where the engine gives one. */
  feasibleOptions: string[];
}

/** The validator: failing constraints, weak inputs, and which plan options the engine found feasible. */
export function validateLot(constraints: Constraint[], playbook: SeattleLotFeasibilityOutput | null, inputs: { existingChargeableSource: string; roomSqft: number | null | undefined }): ValidatorReport {
  const failures = constraints.filter((c) => c.status === "fail").map((c) => `${c.label}: ${c.lot ?? ""} against ${c.limit}${c.citation ? ` (${c.citation})` : " (Pencil)"}`);
  const warnings: string[] = [];
  if (inputs.existingChargeableSource === "footprint_lower_bound") warnings.push("Existing floor area is the house's footprint from city records, a lower bound for a house over one story: floor area left may be overstated.");
  if (inputs.roomSqft == null) warnings.push("The open spot for a DADU was not measured from building outlines.");
  for (const c of constraints) if (c.status === "unknown" && c.id !== "open_spot") warnings.push(`${c.label}: unknown.`);
  for (const c of constraints) if (!c.verified) warnings.push(`${c.label}: the code section is not yet confirmed.`);
  const feasibleOptions = (playbook?.playbook_options ?? []).filter((o) => o.feasible).map((o) => o.configuration_name);
  return { ok: failures.length === 0 && feasibleOptions.length > 0, failures, warnings, feasibleOptions };
}
