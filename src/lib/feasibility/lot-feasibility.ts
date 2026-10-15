import {
  ADU_GARAGE_EXEMPT_SQFT,
  DADU_MAX_GROSS_SQFT,
  DADU_MAX_GROSS_SQFT_3BR,
  NR_HEIGHT,
  aduCountedGarageSqft,
  maxAduLivingSqft,
  maxLotCoverageSqft,
} from "@/lib/adu-analysis";
import type { FeasibilityResult } from "@/lib/feasibility";
import { nrFar, nrMaxFloorArea } from "@/lib/feasibility/far";
import { MIN_FOOTPRINT_SQFT } from "@/lib/tree-analysis";
import { ADU, LOT_SCREEN_NOTE, PENCIL, meetsLotScreen } from "@/lib/rules/seattle-adu";

/**
 * A lot's DADU feasibility in the "SeattleLotFeasibilityOutput" shape of the team's feasibility engine spec (v2.5,
 * section 3; the schema is lot-feasibility.schema.json), for dashboards. Every number comes from the rules engine
 * (lot coverage, FAR, ADU caps, height), never from a model. The spec's 1,000 + 15% coverage curve and alley credits
 * are not used: rag/documents/21-dadu-lot-feasibility-math.md explains why.
 */

/** SMC 23.42.022: at most two ADUs per lot, attached or detached. */
export const MAX_ADUS_PER_LOT = ADU.maxPerLot.value;

/** Floor-to-floor height used to turn the NR height limit into stories: 32 ft allows three. */
export const STORY_HEIGHT_FT = PENCIL.storyHeightFt.value;
export const NR_MAX_STORIES = Math.floor(NR_HEIGHT.base / STORY_HEIGHT_FT);

export interface LotFeasibilityInput {
  lotSqft: number;
  /** Existing building footprint (lot coverage used). */
  existingFootprintSqft: number;
  /** Existing above-grade chargeable floor area. Underground stories do not count. */
  existingChargeableSqft: number;
  /** ADUs already on the lot. */
  existingAdus: number;
  /** Dwelling units on the lot for the headline FAR, house included. Defaults to the house plus two ADUs. */
  units?: number;
  /** Bedrooms per new unit: three or more raises the size cap to 1,200 sq ft. Defaults to two. */
  bedrooms?: number;
  /** Largest open spot for a DADU the building outlines leave (tree-analysis.ts). Null when not measured. */
  roomSqft?: number | null;
  hasAlley?: boolean;
  /**
   * A garage planned in the DADU, attached to it (sq ft). Adds the "DADU with attached garage" option: up to 250 sq ft
   * of it is exempt from the size cap (SMC 23.42.022), but all of it counts toward lot coverage and FAR.
   */
  garageSqft?: number;
}

export interface PlaybookOption {
  configuration_name: string;
  feasible: boolean;
  max_footprint_per_structure: number;
  max_stories_allowed: number;
  design_bottleneck_notes: string;
}

export interface SeattleLotFeasibilityOutput {
  calculations: {
    lot_coverage_sqft: { max_allowed: number; existing_consumed: number; remaining_capacity: number };
    far_sqft: {
      max_allowed_chargeable: number;
      existing_chargeable: number;
      remaining_capacity: number;
      is_small_lot_exception_applied: boolean;
    };
  };
  compliance: {
    max_dadu_count_allowed: number;
    per_unit_size_cap_2br: typeof DADU_MAX_GROSS_SQFT;
    per_unit_size_cap_3br: typeof DADU_MAX_GROSS_SQFT_3BR;
    is_parking_required: false;
  };
  playbook_options: PlaybookOption[];
}

interface Configuration {
  name: string;
  /** New ADUs, the AADU included. */
  newAdus: number;
  /** Detached structures and the DADUs in each. */
  structures: number;
  dadusPerStructure: number;
  stories: number;
  /** The AADU is made from the house's existing floor area: no new coverage or floor area. */
  aadu?: boolean;
  /** The DADU has the input's attached garage on its ground floor. */
  garage?: boolean;
}

const CONFIGURATIONS: Configuration[] = [
  { name: "One DADU, 1 story", newAdus: 1, structures: 1, dadusPerStructure: 1, stories: 1 },
  { name: "One DADU, 2 stories", newAdus: 1, structures: 1, dadusPerStructure: 1, stories: 2 },
  { name: "Two DADUs in one building", newAdus: 2, structures: 1, dadusPerStructure: 2, stories: NR_MAX_STORIES },
  { name: "Two separate DADUs", newAdus: 2, structures: 2, dadusPerStructure: 1, stories: NR_MAX_STORIES },
  { name: "AADU + DADU", newAdus: 2, structures: 1, dadusPerStructure: 1, stories: NR_MAX_STORIES, aadu: true },
];

/** Offered only when the input has a garage: living space over a garage on the ground floor. */
const GARAGE_CONFIGURATION: Configuration = { name: "DADU with attached garage", newAdus: 1, structures: 1, dadusPerStructure: 1, stories: 2, garage: true };

/** Dwelling units for the headline FAR: the override, or the house plus the most ADUs the lot may have. */
export const headlineUnits = (input: LotFeasibilityInput) => input.units ?? 1 + Math.max(input.existingAdus, MAX_ADUS_PER_LOT);

const sf = (n: number) => `${Math.round(n).toLocaleString("en-US")} sq ft`;

export function lotFeasibility(input: LotFeasibilityInput): SeattleLotFeasibilityOutput {
  const lot = input.lotSqft;
  const existingAdus = Math.max(0, input.existingAdus);
  const cap = (input.bedrooms ?? 2) >= 3 ? DADU_MAX_GROSS_SQFT_3BR : DADU_MAX_GROSS_SQFT;
  const room = input.roomSqft ?? null;
  const garageSqft = Math.max(0, input.garageSqft ?? 0);
  const configurations = garageSqft > 0 ? [...CONFIGURATIONS, GARAGE_CONFIGURATION] : CONFIGURATIONS;

  const maxCoverage = maxLotCoverageSqft(lot);
  const coverageLeft = Math.max(0, maxCoverage - input.existingFootprintSqft);
  const floorAreaLeft = (units: number) => Math.max(0, nrMaxFloorArea(lot, units) - input.existingChargeableSqft);

  const units = headlineUnits(input);
  const maxFloor = nrMaxFloorArea(lot, units);
  const aduCount = Math.max(0, MAX_ADUS_PER_LOT - existingAdus);

  const playbook_options = configurations.map((c): PlaybookOption => {
    const base = { configuration_name: c.name, max_stories_allowed: c.stories };
    if (!meetsLotScreen(lot)) {
      return { ...base, feasible: false, max_footprint_per_structure: 0, design_bottleneck_notes: `Lot size: ${sf(lot)}. ${LOT_SCREEN_NOTE}` };
    }
    if (c.newAdus > aduCount) {
      return {
        ...base,
        feasible: false,
        max_footprint_per_structure: 0,
        design_bottleneck_notes: `ADU count: SMC 23.42.022 allows ${MAX_ADUS_PER_LOT} ADUs per lot and ${existingAdus} ${existingAdus === 1 ? "is" : "are"} on record, so ${aduCount} more ${aduCount === 1 ? "fits" : "fit"}; this needs ${c.newAdus}.`,
      };
    }
    const unitsHere = 1 + existingAdus + c.newAdus;
    const farLeft = floorAreaLeft(unitsHere);
    const s = c.structures;
    // The garage is in the building's floor area and footprint; only the size cap leaves out its first 250 sq ft.
    const garage = c.garage ? garageSqft : 0;
    const exempt = Math.min(garage, ADU_GARAGE_EXEMPT_SQFT);
    const capNote = garage > 0
      ? `${sf(cap)} per unit, with ${sf(exempt)} of the ${sf(garage)} garage exempt${aduCountedGarageSqft(garage) > 0 ? ` and ${sf(aduCountedGarageSqft(garage))} counted` : ""} (SMC 23.42.022), so up to ${sf(maxAduLivingSqft(cap, garage))} of living space`
      : `${c.dadusPerStructure > 1 ? `${c.dadusPerStructure} x ` : ""}${sf(cap)} per unit (SMC 23.42.022.G)`;
    // Each limit on the floor area of one detached structure, garage included; the smallest binds.
    const limits: { label: string; sqft: number; note: string }[] = [
      { label: "Unit size cap", sqft: c.dadusPerStructure * maxAduLivingSqft(cap, garage) + garage, note: capNote },
      { label: "Floor area (FAR)", sqft: farLeft / s, note: `${sf(farLeft)} of chargeable floor area left at FAR ${nrFar(lot, unitsHere).toFixed(1)} with ${unitsHere} units${s > 1 ? `, shared by ${s} buildings` : ""} (SMC 23.44.050)` },
      { label: "Lot coverage", sqft: (c.stories * coverageLeft) / s, note: `${sf(coverageLeft)} of footprint left under 50% coverage${s > 1 ? `, shared by ${s} buildings` : ""}, over ${c.stories} ${c.stories === 1 ? "story" : "stories"} (SMC 23.44.080)` },
    ];
    if (room != null) {
      limits.push({ label: "Open spot", sqft: (c.stories * room) / s, note: `the largest open spot the house leaves is ${sf(room)}${s > 1 ? `, shared by ${s} buildings` : ""}, over ${c.stories} ${c.stories === 1 ? "story" : "stories"}` });
    }
    const binding = limits.reduce((a, b) => (b.sqft < a.sqft ? b : a));
    const floorPerStructure = binding.sqft;
    const footprintLimit = Math.min(coverageLeft, room ?? Infinity) / s;
    const footprint = Math.floor(Math.min(footprintLimit, floorPerStructure));
    const floorPerUnit = Math.max(0, floorPerStructure - garage) / c.dadusPerStructure;
    const garageFits = footprintLimit >= garage;
    const feasible = footprintLimit >= MIN_FOOTPRINT_SQFT && floorPerUnit >= MIN_FOOTPRINT_SQFT && garageFits;

    const notes = [
      `${binding.label} binds: ${binding.note}.`,
      feasible
        ? garage > 0
          ? `Up to ${sf(floorPerUnit)} of living space plus the ${sf(garage)} garage, a ${sf(floorPerStructure)} building.`
          : `Up to ${sf(floorPerUnit)} per DADU${s > 1 ? ` in each of ${s} buildings` : ""}.`
        : footprintLimit < MIN_FOOTPRINT_SQFT
          ? `Under the ${sf(MIN_FOOTPRINT_SQFT)} (15 x 20 ft) smallest DADU footprint per building.`
          : !garageFits
            ? `The ${sf(garage)} garage does not fit in the ${sf(footprintLimit)} of footprint left.`
            : `Under ${sf(MIN_FOOTPRINT_SQFT)} of floor area per DADU.`,
    ];
    if (garage > 0) notes.push(`The garage's full ${sf(garage)} footprint counts toward lot coverage (SMC 23.44.080) and is counted toward FAR.`);
    if (c.aadu) notes.push("Assumes the AADU is made from the house's existing floor area; an addition would use coverage and floor area too.");
    if (s > 1) notes.push("Buildings must stand 5 ft apart (SMC 23.44.100); the split of the open spot is not checked.");
    if (input.hasAlley) notes.push("An alley abuts the lot: the DADU's rear setback is 0 ft (SMC 23.44.090).");

    return { ...base, feasible, max_footprint_per_structure: Math.max(0, footprint), design_bottleneck_notes: notes.join(" ") };
  });

  return {
    calculations: {
      lot_coverage_sqft: {
        max_allowed: maxCoverage,
        existing_consumed: input.existingFootprintSqft,
        remaining_capacity: coverageLeft,
      },
      far_sqft: {
        max_allowed_chargeable: maxFloor,
        existing_chargeable: input.existingChargeableSqft,
        remaining_capacity: Math.max(0, maxFloor - input.existingChargeableSqft),
        // The 2,500 sq ft small-lot floor (SMC 23.44.050.B) applies when it beats FAR x lot.
        is_small_lot_exception_applied: maxFloor > Math.round(nrFar(lot, units) * lot),
      },
    },
    compliance: {
      max_dadu_count_allowed: aduCount,
      per_unit_size_cap_2br: DADU_MAX_GROSS_SQFT,
      per_unit_size_cap_3br: DADU_MAX_GROSS_SQFT_3BR,
      is_parking_required: false,
    },
    playbook_options,
  };
}

export interface LotFeasibilityOverrides {
  units?: number;
  bedrooms?: number;
  /** Existing above-grade floor area, when known: city records only carry the footprint. */
  existingChargeableSqft?: number;
  /** A garage planned in the DADU, attached to it. */
  garageSqft?: number;
}

/** Where the existing chargeable floor area came from: city records only give the footprint, a lower bound. */
export type ExistingChargeableSource = "override" | "footprint_lower_bound";

/**
 * The engine's inputs from a feasibility run (src/lib/server/feasibility-query.ts). Null without a lot size. City
 * records give the house's footprint (ADUniverse TOT_SQFT), not its floor area, so without an override the footprint
 * stands in for the existing chargeable floor area: a lower bound for a house of more than one story.
 */
export function lotFeasibilityInputFrom(
  result: FeasibilityResult,
  overrides: LotFeasibilityOverrides = {}
): { input: LotFeasibilityInput; existingChargeableSource: ExistingChargeableSource } | null {
  const lot = result.parcel?.lotSqft;
  if (lot == null || !Number.isFinite(lot) || lot <= 0) return null;
  const f = result.feasibility;
  let covFrac = f?.lotCoveragePercent ?? 0;
  if (covFrac > 1) covFrac /= 100;
  const footprint = f?.totalBuildingSqft ?? Math.round(covFrac * lot);
  const source: ExistingChargeableSource = overrides.existingChargeableSqft != null ? "override" : "footprint_lower_bound";
  return {
    input: {
      lotSqft: lot,
      existingFootprintSqft: footprint,
      existingChargeableSqft: overrides.existingChargeableSqft ?? footprint,
      existingAdus: f?.totalADU ?? 0,
      units: overrides.units,
      bedrooms: overrides.bedrooms,
      roomSqft: f?.treeStats?.siteSqft ?? null,
      hasAlley: f?.hasAlley ?? false,
      garageSqft: overrides.garageSqft,
    },
    existingChargeableSource: source,
  };
}
