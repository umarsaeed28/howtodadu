/**
 * Seattle's pre-approved DADU designs, from the City's ADUniverse gallery
 * (https://aduniverse-seattlecitygis.hub.arcgis.com/pages/gallery), checked against each designer's submitted plan set.
 * Footprints are the building's overall width x depth in feet. `approx` marks the ones read off a scaled drawing or
 * derived from a stated total area rather than a printed dimension. ADUniverse 2.0 designs arrive in January 2027: add them here.
 */
export interface PreApprovedPlan {
  id: string;
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
  { id: "cast-cedar", designer: "CAST Architecture", name: "Cedar Cottage", sqft: 467, beds: "1", baths: "1", stories: 1, widthFt: 32.25, depthFt: 16.5, approx: true, note: "One level with a covered porch (531 sf total). A 2-bedroom version is also approved.", licenseFee: 1000, detailUrl: `${PAGE}/cast-arch` },
  { id: "magellan-madadu", designer: "Magellan Architects", name: "MADADU", sqft: 527, beds: "1", baths: "1", stories: 1, widthFt: 14.75, depthFt: 36, approx: false, note: "Narrow one-story plan that meets the Accessible DADU rule.", licenseFee: 1000, detailUrl: `${PAGE}/magellan-arch` },
  { id: "haas-studio", designer: "HAAS Building", name: "Urban Cottage Studio", sqft: 288, beds: "Studio", baths: "1", stories: 1, widthFt: 12, depthFt: 24, approx: false, note: "Prefab SIP panels. The base unit; add bedrooms later.", licenseFee: 900, detailUrl: `${PAGE}/urban-cottage` },
  { id: "haas-1br", designer: "HAAS Building", name: "Urban Cottage 1 Bed", sqft: 432, beds: "1", baths: "1", stories: 1, widthFt: 36, depthFt: 12, approx: false, note: "Linear layout. An L-shaped 24 x 24 layout is also approved.", licenseFee: 900, detailUrl: `${PAGE}/urban-cottage` },
  { id: "haas-2br", designer: "HAAS Building", name: "Urban Cottage 2 Bed", sqft: 576, beds: "2", baths: "1", stories: 1, widthFt: 24, depthFt: 24, approx: false, note: "Square single-story footprint.", licenseFee: 900, detailUrl: `${PAGE}/urban-cottage` },
  { id: "artisans-seattle", designer: "Artisans Group", name: "Seattle DADU", sqft: 600, beds: "1", baths: "1", stories: 1, widthFt: 30, depthFt: 20, approx: true, note: "Accessible one-bedroom with 3 ft doors; gable or shed roof.", licenseFee: 1000, detailUrl: `${PAGE}/artisans-group` },
  { id: "yes-sky-house", designer: "YES Architecture", name: "Sky House", sqft: 600, beds: "2", baths: "1", stories: 2, widthFt: 20, depthFt: 15, approx: false, note: "Small 300 sf footprint; living floor above. Can be rotated and flipped.", licenseFee: 1000, detailUrl: `${PAGE}/yes-arch` },
  { id: "moa-family", designer: "Mobile Office Architects", name: "MOA Family ADU", sqft: 850, beds: "2", baths: "1", stories: 2, widthFt: 16, depthFt: 26, approx: false, note: "Two-story family unit on a compact 16 x 26 footprint.", licenseFee: 1000, detailUrl: `${PAGE}/mo-arch` },
  { id: "ahouse-family-808", designer: "Ahouse Studio", name: "The Family, 2 bed", sqft: 808, beds: "2", baths: "2", stories: 2, widthFt: 17.67, depthFt: 30, approx: false, note: "Two stories on lots 30 ft wide and up. Symmetrical, so it can sit either way round.", licenseFee: 1000, detailUrl: `${PAGE}/ahouse-studio` },
  { id: "ahouse-family-964", designer: "Ahouse Studio", name: "The Family, 3 bed", sqft: 964, beds: "3", baths: "2", stories: 2, widthFt: 17.67, depthFt: 30, approx: false, note: "Same footprint as the 2-bed with an extra bedroom upstairs.", licenseFee: 1000, detailUrl: `${PAGE}/ahouse-studio` },
  { id: "fivedot-schooner", designer: "Fivedot Architects", name: "Schooner", sqft: 1000, beds: "2", baths: "1.5", stories: 2, widthFt: 34, depthFt: 16, approx: false, note: "Simple rectangle. Can be mirrored or rotated to face the private side of the lot.", licenseFee: 1000, detailUrl: `${PAGE}/fivedot-arch` },
  { id: "shape-willow-creek", designer: "Shape Architecture", name: "Willow Creek DADU", sqft: 624, beds: "1", baths: "1", stories: 1, widthFt: 26, depthFt: 24, approx: false, note: "Living space over a garage or storage level, with an exterior stair.", licenseFee: 750, detailUrl: `${PAGE}/shape-arch` },
  { id: "bcj-edge", designer: "Bohlin Cywinski Jackson", name: "Edge House", sqft: 432, beds: "1", baths: "1", stories: 1, widthFt: 31, depthFt: 25.2, approx: true, note: "Steel-frame kit with a deck. Footprint is the roof outline (about 780 sf), so it takes more yard than its floor area.", licenseFee: 1000, detailUrl: `${PAGE}/bcj` },
];

export const planFootprintSf = (p: Pick<PreApprovedPlan, "widthFt" | "depthFt">) => Math.round(p.widthFt * p.depthFt);
