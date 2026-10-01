/**
 * Seattle's pre-approved DADU designs, from the City's ADUniverse gallery
 * (https://aduniverse-seattlecitygis.hub.arcgis.com/pages/gallery): only the designs the City has pre-approved, checked against each designer's submitted plan set.
 * Footprints are the building's overall width x depth in feet. `approx` marks the ones read off a scaled drawing or
 * derived from a stated total area rather than a printed dimension. ADUniverse 2.0 designs arrive in January 2027: add them here.
 */
export interface PreApprovedPlan {
  id: string;
  /** The design this size belongs to. One card per family; sizes are chosen after placing it. */
  family: string;
  /** Short label for this size or option, shown when a design has more than one. */
  option: string;
  designer: string;
  name: string;
  /** Interior floor area the designer publishes, in square feet (the larger figure when a design has options). */
  sqft: number;
  beds: string;
  baths: string;
  /** Floors of living space. */
  stories: 1 | 2;
  widthFt: number;
  depthFt: number;
  approx: boolean;
  /** What to know about this variant, in a sentence. */
  note: string;
  /** Pre-approved plan license fee in dollars, as listed by the designer. */
  licenseFee: number;
  detailUrl: string;
}

const PAGE = "https://aduniverse-seattlecitygis.hub.arcgis.com/pages";

export const PREAPPROVED_PLANS: PreApprovedPlan[] = [
  { id: "cast-cedar", family: "cast-cedar", option: "1 bed", designer: "CAST Architecture", name: "Cedar Cottage", sqft: 467, beds: "1", baths: "1", stories: 1, widthFt: 32.25, depthFt: 16.5, approx: true, note: "One level with a covered porch (531 sf total). A 2-bedroom version is also approved.", licenseFee: 1000, detailUrl: `${PAGE}/cast-arch` },
  { id: "haas-studio", family: "haas", option: "Studio 288", designer: "Haas Architectural", name: "Urban Cottage Studio", sqft: 288, beds: "Studio", baths: "1", stories: 1, widthFt: 12, depthFt: 24, approx: false, note: "Prefab SIP panels. The base unit; add bedrooms later.", licenseFee: 900, detailUrl: `${PAGE}/urban-cottage` },
  { id: "haas-1br", family: "haas", option: "1 bed 432", designer: "Haas Architectural", name: "Urban Cottage 1 Bed", sqft: 432, beds: "1", baths: "1", stories: 1, widthFt: 36, depthFt: 12, approx: false, note: "Linear layout. An L-shaped 24 x 24 layout is also approved.", licenseFee: 900, detailUrl: `${PAGE}/urban-cottage` },
  { id: "haas-2br", family: "haas", option: "2 bed 576", designer: "Haas Architectural", name: "Urban Cottage 2 Bed", sqft: 576, beds: "2", baths: "1", stories: 1, widthFt: 24, depthFt: 24, approx: false, note: "Square single-story footprint.", licenseFee: 900, detailUrl: `${PAGE}/urban-cottage` },
  { id: "haas-two-story", family: "haas", option: "Two story 940", designer: "Haas Architectural", name: "Urban Cottage Two Story", sqft: 940, beds: "2", baths: "1", stories: 2, widthFt: 24, depthFt: 20, approx: true, note: "The two-story option. Footprint is derived from the 940 sf total, since the plan set does not print it.", licenseFee: 900, detailUrl: `${PAGE}/urban-cottage` },
  { id: "artisans-seattle", family: "artisans-seattle", option: "1 bed", designer: "Artisans Group", name: "Seattle DADU", sqft: 600, beds: "1", baths: "1", stories: 1, widthFt: 30, depthFt: 20, approx: true, note: "Accessible one-bedroom with 3 ft doors; gable or shed roof.", licenseFee: 1000, detailUrl: `${PAGE}/artisans-group` },
  { id: "moa-family", family: "moa-family", option: "2 bed", designer: "Mobile Office Architects", name: "MOA Family ADU", sqft: 850, beds: "2", baths: "1", stories: 2, widthFt: 16, depthFt: 26, approx: false, note: "Two-story family unit on a compact 16 x 26 footprint.", licenseFee: 1000, detailUrl: `${PAGE}/mo-arch` },
  { id: "ahouse-family-808", family: "ahouse-family", option: "2 bed 808", designer: "Ahouse Studio", name: "The Family, 2 bed", sqft: 808, beds: "2", baths: "2", stories: 2, widthFt: 17.67, depthFt: 30, approx: false, note: "Two stories on lots 30 ft wide and up. Symmetrical, so it can sit either way round.", licenseFee: 1000, detailUrl: `${PAGE}/ahouse-studio` },
  { id: "ahouse-family-964", family: "ahouse-family", option: "3 bed 964", designer: "Ahouse Studio", name: "The Family, 3 bed", sqft: 964, beds: "3", baths: "2", stories: 2, widthFt: 17.67, depthFt: 30, approx: false, note: "Same footprint as the 2-bed with an extra bedroom upstairs.", licenseFee: 1000, detailUrl: `${PAGE}/ahouse-studio` },
  { id: "fivedot-schooner", family: "fivedot-schooner", option: "2 bed", designer: "Fivedot Architects", name: "Schooner", sqft: 1000, beds: "2", baths: "2", stories: 2, widthFt: 34, depthFt: 16, approx: false, note: "Simple rectangle. Can be mirrored or rotated to face the private side of the lot.", licenseFee: 1000, detailUrl: `${PAGE}/fivedot-arch` },
  { id: "shape-willow-creek", family: "shape-willow-creek", option: "1 bed", designer: "Shape Architecture", name: "Willow Creek DADU", sqft: 624, beds: "1", baths: "1", stories: 1, widthFt: 26, depthFt: 24, approx: false, note: "Living space over a garage or storage level, with an exterior stair.", licenseFee: 750, detailUrl: `${PAGE}/shape-arch` },
];

export const planFootprintSf = (p: Pick<PreApprovedPlan, "widthFt" | "depthFt">) => Math.round(p.widthFt * p.depthFt);

/** One entry per design, with its sizes in catalogue order. */
export function planFamilies(plans: PreApprovedPlan[] = PREAPPROVED_PLANS): PreApprovedPlan[][] {
  const out = new Map<string, PreApprovedPlan[]>();
  for (const p of plans) out.set(p.family, [...(out.get(p.family) ?? []), p]);
  return [...out.values()];
}
