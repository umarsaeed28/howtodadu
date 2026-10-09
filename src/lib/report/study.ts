/**
 * The feasibility study: the report's written sections, in the order an architect's DADU feasibility study uses
 * (overview, property information, jurisdiction and zoning, development standards, lot coverage, FAR, DADU
 * regulations, overhead utilities, conclusion). One builder feeds both the web report and the PDF.
 *
 * Every figure comes from the engine's own outputs (adu-analysis, the site envelope, far.ts) or city records; this
 * file only words them. Where the engine has no data (overhead lines, porch areas) the section says what to check.
 */
import { NR_HEIGHT, type ADUReport } from "@/lib/adu-analysis";
import type { FeasibilityData } from "@/lib/feasibility";
import { isNeighborhoodResidential, maxFarForZone, maxFloorAreaForZone } from "@/lib/feasibility/far";
import { FRONT_SETBACK_FT, STREET_SIDE_SETBACK_FT } from "@/lib/site-envelope";
import { GRADE_STEEP_PCT } from "@/lib/grade";

export type StudyRow = { item: string; value: string; ref?: string };
export type DrawnDadu = { living: number; footprint: number; w: number; d: number; stories: 1 | 2 };

export type Study = {
  overview: string[];
  property: StudyRow[];
  jurisdiction: StudyRow[];
  standards: StudyRow[];
  coverage: { rows: StudyRow[]; summary: string } | null;
  far: { rows: StudyRow[]; summary: string } | null;
  dadu: StudyRow[];
  utilities: { summary: string; clearances: string[] };
  dueDiligence: string[];
  conclusion: string;
};

export type StudyInput = {
  address: string;
  pin: string | null;
  zoning: string | null;
  neighborhood: string | null;
  urbanVillage: string | null;
  lotSqft: number | null;
  yearBuilt: string | number | null;
  feasibility: FeasibilityData | null;
  adu: ADUReport | null;
  verdict: "Feasible" | "Conditional" | "Not feasible";
  /** The DADU as drawn on the master plan, when the visitor changed it. Otherwise the engine's largest DADU is used. */
  drawn?: DrawnDadu | null;
};

const n = (x: number) => Math.round(x).toLocaleString("en-US");
const sf = (x: number) => `${n(x)} SF`;
/** "3589500190" → "358950-0190", the way the county prints it. */
export const formatPin = (pin: string) => (/^\d{10}$/.test(pin) ? `${pin.slice(0, 6)}-${pin.slice(6)}` : pin);
/**
 * The zone's current name. City parcel layers still carry the pre-2021 single-family names; Seattle renamed them
 * (SF 9600 → NR1, SF 7200 → NR2, SF 5000 → NR3), so the study uses the current name and notes the recorded one.
 */
export function currentZone(z: string | null | undefined): string | null {
  if (!z) return null;
  const t = z.trim().toUpperCase().replace(/\s+/g, " ");
  const legacy: Record<string, string> = { "SF 9600": "NR1", "SF 7200": "NR2", "SF 5000": "NR3" };
  return legacy[t] ?? t;
}
const zoneName = (z: string | null) => {
  if (!z) return "Not available";
  const cur = currentZone(z)!;
  const m = cur.match(/^NR(\d)?$/);
  const recorded = cur !== z.trim().toUpperCase() ? `, recorded as ${z.trim()}` : "";
  return m ? `Neighborhood Residential${m[1] ? ` ${m[1]}` : ""} (${cur}${recorded})` : z;
};

export function buildStudy(i: StudyInput): Study {
  const f = i.feasibility;
  const fp = i.adu?.daduFootprint ?? null;
  const cov = i.adu?.coverage ?? null;
  const alley = !!f?.hasAlley;
  const grade = f?.gradeStats ?? null;
  const steep = grade ? grade.slopePct >= GRADE_STEEP_PCT : false;
  const existingFloor = f?.totalBuildingSqft ?? null;
  const garages = f?.detachedGarageCount ?? 0;
  const adus = f?.totalADU ?? 0;
  const maxDadu = fp?.maxAllowedSqft ?? null;
  const proposedLiving = i.drawn?.living ?? fp?.buildableSqft ?? null;
  const proposedFootprint = i.drawn?.footprint ?? fp?.footprintSqft ?? null;
  const proposedLabel = i.drawn ? `the DADU as drawn (${i.drawn.w} x ${i.drawn.d} ft, ${sf(i.drawn.living)})` : proposedLiving ? `a ${sf(proposedLiving)} DADU` : "a DADU";
  const lot = i.lotSqft;
  const hood = i.urbanVillage || i.neighborhood || null;
  const year = i.yearBuilt ? String(i.yearBuilt) : f?.minYearBuilt ? String(f.minYearBuilt) : null;

  const overview = [
    `This study evaluates keeping the existing single-family house at ${i.address} and building a new detached accessory dwelling unit (DADU) behind it.`,
    `The lot is ${lot ? sf(lot) : "of unknown size"} and zoned ${zoneName(i.zoning)}${hood ? `, in ${hood}` : ""}. ${alley ? "A public alley runs along the rear lot line, which suits a DADU well for construction access, utilities and the DADU's own entry." : "There is no alley, so construction, utilities and the path to the DADU come from the street, past the house."}${grade ? ` The ground across the DADU site ${steep ? `slopes about ${Math.round(grade.slopePct)}%, so grading or retaining walls are likely` : `is fairly gentle (about ${Math.round(grade.riseFt)} ft of fall)`}.` : ""}`,
    i.verdict === "Feasible"
      ? "On the city and county data, the site looks favorable for a DADU, with no major constraint found in this review."
      : i.verdict === "Conditional"
        ? "On the city and county data, a DADU looks possible here, with conditions noted below that need resolving in design."
        : "On the city and county data, the site has a constraint that rules a DADU out as it stands, explained below.",
    "A boundary and topographic survey, utility verification and a tree assessment are recommended in design to confirm these assumptions.",
  ];

  const property: StudyRow[] = [
    { item: "Property address", value: i.address },
    ...(i.pin ? [{ item: "Parcel number", value: formatPin(i.pin) }] : []),
    { item: "Zoning", value: zoneName(i.zoning) },
    { item: "Lot size", value: lot ? sf(lot) : "Not available" },
    { item: "Existing residence", value: `Existing single-family house${year ? `, built ${year}` : ""}${existingFloor ? `, with a building footprint of about ${sf(existingFloor)} on city records` : ""}.` },
    { item: "Existing garage / structures", value: garages > 0 ? `${garages} detached garage${garages === 1 ? "" : "s"}${f?.detachedGarageSqft ? ` (${sf(f.detachedGarageSqft)})` : ""}.` : "No detached garage on record." },
    { item: "Existing ADUs", value: adus > 0 ? `${adus} on record.` : "None on record." },
    { item: "Rear alley access", value: alley ? "Yes. A public alley along the rear lot line gives access for construction, utilities and the DADU." : "No alley. Access is from the street, through the side yard." },
    { item: "Topography", value: grade ? `About ${Math.round(grade.riseFt)} ft of fall across the DADU site (${Math.round(grade.slopePct)}% slope, 1 m lidar).${steep ? " Grading and retaining walls may be needed." : ""}` : "Not measured." },
  ];

  const jurisdiction: StudyRow[] = [
    { item: "Jurisdiction", value: "City of Seattle" },
    { item: "Review agency", value: "Seattle Department of Construction and Inspections (SDCI)" },
    ...(hood ? [{ item: "Neighborhood", value: hood }] : []),
    { item: "Zoning", value: zoneName(i.zoning) },
  ];

  const zone = currentZone(i.zoning);
  const nr = isNeighborhoodResidential(zone);
  // The house, any ADUs already there, and the new DADU: density sets the NR FAR (SMC 23.42.022.J, 23.44.050).
  const units = 1 + Math.min(adus, 1) + 1;
  const maxFar = maxFarForZone(zone, lot, units);
  const allowedFloor = maxFloorAreaForZone(zone, lot, units);
  const farValue = maxFar == null
    ? "Not available"
    : nr
      ? `${maxFar.toFixed(1)} for the house and a DADU on this lot`
      : `${maxFar.toFixed(1)} (estimate for the zone)`;
  const nrHeight = nr ? `${NR_HEIGHT.base} ft, plus ${NR_HEIGHT.pitched} ft for a pitched roof (${NR_HEIGHT.base + NR_HEIGHT.pitched} ft to the ridge)` : null;
  const standards: StudyRow[] = [
    { item: "Front setback", value: `${FRONT_SETBACK_FT} ft (one or two dwelling units)`, ref: "SMC 23.44.090" },
    { item: "Side setback", value: `${fp?.sideSetback ?? 5} ft${STREET_SIDE_SETBACK_FT ? ` (${STREET_SIDE_SETBACK_FT} ft on a street side, Pencil's assumption)` : ""}`, ref: "SMC 23.44.090" },
    { item: "Rear setback", value: alley ? "0 ft on the alley" : `${fp?.rearSetback ?? 5} ft (no alley)`, ref: "SMC 23.44.090, note 3" },
    { item: "DADU height", value: nrHeight ?? (fp ? `${fp.maxHeight} ft (from the lot's width)` : "Not available"), ref: nr ? "SMC 23.42.022.E, 23.44.070" : "Repealed SMC 23.44.041, confirm" },
    { item: "Floor area ratio (FAR)", value: farValue, ref: nr ? "SMC 23.44.050" : "Estimate" },
    { item: "Lot coverage", value: cov ? `${Math.round(cov.maxPercent)}% maximum (${sf(cov.maxSqft)})` : "Not available", ref: "SMC 23.44.080" },
    { item: "Building separation", value: "5 ft minimum between the DADU and the house", ref: "SMC 23.44.100" },
  ];

  const coverage = cov && lot
    ? {
        rows: [
          { item: "Parcel area", value: sf(lot) },
          { item: "Maximum lot coverage", value: `${Math.round(cov.maxPercent)}% = ${sf(cov.maxSqft)}` },
          { item: "Existing coverage", value: `${sf(cov.usedSqft)} (${Math.round(cov.currentPercent)}%)` },
          { item: "Remaining allowable coverage", value: sf(cov.availableSqft) },
          ...(proposedFootprint ? [{ item: "Proposed DADU footprint", value: sf(proposedFootprint) }] : []),
        ],
        summary: proposedFootprint
          ? proposedFootprint <= cov.availableSqft
            ? `About ${sf(cov.availableSqft)} of coverage remains, enough for ${proposedLabel}, whose footprint is ${sf(proposedFootprint)}.`
            : `About ${sf(cov.availableSqft)} of coverage remains, less than the ${sf(proposedFootprint)} footprint of ${proposedLabel}. A smaller footprint or a second story is needed.`
          : `About ${sf(cov.availableSqft)} of lot coverage remains for new building.`,
      }
    : null;

  const farWord = nr ? "FAR" : "FAR (estimate)";
  const atFar = nr ? "under SMC 23.44.050" : "at the estimated FAR";
  const far = allowedFloor != null && maxFar != null
    ? {
        rows: [
          { item: farWord, value: maxFar.toFixed(1) },
          { item: "Allowed floor area", value: sf(allowedFloor) },
          ...(existingFloor ? [{ item: "Existing house (footprint on record)", value: sf(existingFloor) }] : []),
          ...(existingFloor ? [{ item: "Remaining floor area, at most", value: sf(Math.max(0, allowedFloor - existingFloor)) }] : []),
          ...(proposedLiving ? [{ item: "Proposed DADU", value: sf(proposedLiving) }] : []),
        ],
        summary: existingFloor && proposedLiving
          ? `The lot allows about ${sf(allowedFloor)} of floor area ${atFar}, counting the house and the DADU. City records give the house a ${sf(existingFloor)} footprint; a house of more than one story has more floor area than that, so take its finished area from the assessor's record. ${allowedFloor - existingFloor >= proposedLiving ? `Even so, there is room for ${proposedLabel} unless the house's total floor area exceeds ${sf(allowedFloor - proposedLiving)}.` : `On the footprint alone, ${proposedLabel} already exceeds what remains; confirm the FAR and any exemptions with SDCI.`}`
          : `The lot allows about ${sf(allowedFloor)} of floor area ${atFar}.`,
      }
    : null;

  const dadu: StudyRow[] = [
    { item: "Number of ADUs", value: `Up to two accessory dwelling units on a lot with a house.${adus ? ` ${adus} already on record.` : ""}`, ref: "SMC 23.42.022.C" },
    { item: "Maximum DADU size", value: maxDadu ? `${sf(maxDadu)} of gross floor area with up to two bedrooms (1,200 SF with three or more)` : "Not available", ref: "SMC 23.42.022.G" },
    { item: "Maximum height", value: nrHeight ? `${nrHeight}, the same as the house` : fp ? `${fp.maxHeight} ft for this lot's width` : "Not available", ref: nr ? "SMC 23.42.022.E, 23.44.070" : "Repealed SMC 23.44.041, confirm" },
    { item: "Floor area ratio", value: "The DADU's floor area counts toward the lot's FAR.", ref: "SMC 23.44.050" },
    { item: "Parking", value: "No off-street parking is required for a DADU.", ref: "SMC 23.42.022.I" },
    { item: "Owner occupancy", value: "Not required." },
    { item: "Utilities", value: "The DADU may share the house's services or have its own. Coordinate with Seattle Public Utilities and Seattle City Light; an electrical service upgrade may be needed." },
    { item: "Building code", value: "Must meet the Seattle Residential, Energy, Mechanical, Electrical, critical areas and shoreline codes." },
  ];

  const utilities = {
    summary: `${alley ? "Check the alley" : "Check the street and side yard"} for utility poles and overhead lines near the DADU. They can push walls in, lower the roof, or move the DADU. Clearances depend on the line's voltage and must be confirmed with Seattle City Light during design.`,
    clearances: ["Utility pole: about 5 ft clear", "Primary distribution line: about 14 ft clear", "Secondary service line: about 5 ft clear"],
  };

  const dueDiligence = [
    "Boundary and topographic survey",
    "Utility verification (sewer, water, electrical service) with Seattle Public Utilities and Seattle City Light",
    "Tree assessment for any trees near the DADU site",
    ...(f?.ecaSeattleGisLayers?.length ? ["Critical-area review with SDCI"] : []),
    "Pre-submittal check with SDCI on setbacks, height and floor area",
  ];

  const conclusion =
    i.verdict === "Feasible"
      ? `Based on this preliminary review, ${i.address} appears to be a good candidate for a DADU. It appears to meet the zoning, floor area and lot coverage requirements, with no major constraint found. Confirm with a survey, utility verification and permit review in design.`
      : i.verdict === "Conditional"
        ? `Based on this preliminary review, a DADU at ${i.address} appears possible, with the conditions above to resolve in design. Confirm with a survey, utility verification and permit review.`
        : `Based on this preliminary review, ${i.address} has a constraint that rules out a DADU as the lot stands. The risks above explain it; a design or code change could open it up.`;

  return { overview, property, jurisdiction, standards, coverage, far, dadu, utilities, dueDiligence, conclusion };
}
