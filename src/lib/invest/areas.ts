/**
 * Seattle ZIP codes and the neighborhoods they mostly cover, for the Invest feed's neighborhood filter and tile
 * labels. A ZIP spans several neighborhoods, so these are the common names, not boundaries.
 */
export const SEATTLE_AREAS: Record<string, string> = {
  "98101": "Downtown",
  "98102": "Capitol Hill / Eastlake",
  "98103": "Fremont / Wallingford / Green Lake",
  "98104": "Pioneer Square",
  "98105": "University District / Laurelhurst",
  "98106": "Delridge / Highland Park",
  "98107": "Ballard",
  "98108": "Beacon Hill / Georgetown",
  "98109": "Queen Anne / South Lake Union",
  "98112": "Madison Park / Montlake",
  "98115": "Ravenna / Wedgwood",
  "98116": "West Seattle (Alki)",
  "98117": "Ballard / Crown Hill",
  "98118": "Columbia City / Rainier Valley",
  "98119": "Queen Anne",
  "98121": "Belltown",
  "98122": "Central District",
  "98125": "Lake City / Northgate",
  "98126": "West Seattle (High Point)",
  "98133": "Bitter Lake / Haller Lake",
  "98136": "West Seattle (Fauntleroy)",
  "98144": "Mount Baker",
  "98146": "White Center",
  "98177": "Broadview",
  "98178": "Rainier Beach",
  "98199": "Magnolia",
};

export const areaFor = (zip: string | null | undefined) => (zip && SEATTLE_AREAS[zip]) || (zip ? `ZIP ${zip}` : "Seattle");
