import { DADU_MAX_GROSS_SQFT, NR_HEIGHT, NR_MAX_LOT_COVERAGE } from "@/lib/adu-analysis";
import { FRONT_SETBACK_FT } from "@/lib/site-envelope";
import { NR_UNITS_HOUSE_AND_DADU, isNeighborhoodResidential, maxFloorAreaForZone, nrFar } from "@/lib/feasibility/far";

/** ADU standards, SMC 23.42.022 since Ordinance 127211 (June 2025). */
export const SMC_2342022 =
  "https://library.municode.com/wa/seattle/codes/municipal_code?nodeId=TIT23LAUSCO_SUBTITLE_IIILAUSRE_CH23.42GEUSPR_23.42.022ACDWUN";

export interface DaduRule {
  item: string;
  value: string;
  ref: string;
}

const sf = (n: number) => `${n.toLocaleString()} sq ft`;

/** DADU height in NR: the house's limit, SMC 23.42.022.E and 23.44.070. */
export const NR_DADU_HEIGHT_COPY = `${NR_HEIGHT.base} ft, plus ${NR_HEIGHT.pitched} ft for a pitched roof (${NR_HEIGHT.base + NR_HEIGHT.pitched} ft to the ridge) or ${NR_HEIGHT.shed} ft for a shed or butterfly roof`;

/**
 * Current DADU standards for the deal-screening views. NR follows Council Bill 120993 (January 2026); other zones
 * only get the rules that do not depend on the zone, since their own limits are not modeled.
 */
export function daduRules(zoning: string | null | undefined, lotSqft: number | null | undefined): DaduRule[] {
  const size: DaduRule = {
    item: "DADU size",
    value: `${sf(DADU_MAX_GROSS_SQFT)} of gross floor area with up to two bedrooms (1,200 sq ft with three or more), on any size lot`,
    ref: "SMC 23.42.022.G",
  };
  if (!isNeighborhoodResidential(zoning)) {
    return [
      {
        item: "DADU height",
        value: "The same as the house's height limit in this zone. Confirm with SDCI.",
        ref: "SMC 23.42.022.E",
      },
      size,
    ];
  }
  const lot = lotSqft != null && Number.isFinite(lotSqft) && lotSqft > 0 ? lotSqft : null;
  const floor = maxFloorAreaForZone(zoning, lot);
  return [
    { item: "DADU height", value: `${NR_DADU_HEIGHT_COPY}, the same as the house`, ref: "SMC 23.42.022.E, 23.44.070" },
    size,
    { item: "Front setback", value: `${FRONT_SETBACK_FT} ft with one or two dwelling units`, ref: "SMC 23.44.090" },
    {
      item: "Lot coverage",
      value: `${Math.round(NR_MAX_LOT_COVERAGE * 100)}% of the lot${lot ? ` (${sf(Math.round(NR_MAX_LOT_COVERAGE * lot))})` : ""}, counting the DADU`,
      ref: "SMC 23.44.080",
    },
    {
      item: "Floor area ratio",
      value:
        lot && floor != null
          ? `${nrFar(lot, NR_UNITS_HOUSE_AND_DADU).toFixed(1)} for the house and a DADU on this lot (${sf(floor)} of floor area)`
          : "0.6 to 1.6, set by the lot area per dwelling unit",
      ref: "SMC 23.44.050",
    },
  ];
}
