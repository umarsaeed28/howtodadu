/**
 * Pencil's case studies. Every figure here comes from the project owner; nothing is estimated by the site.
 * ARV is the after-repair value. Equity and return on cost are before financing, holding and selling costs.
 */
export interface CaseStudyImage {
  /** public/case-studies/<slug>/<file>. Until the file is added, the page shows a labeled empty slot. */
  src: string | null;
  alt: string;
  caption: string;
}

export interface CaseStudy {
  slug: string;
  title: string;
  address: string;
  neighborhood: string;
  summary: string;
  lot: { sqft: number; zoning: string; widthFt: number; depthFt: number; alley: boolean; yearBuilt: number; pin: string };
  purchase: number;
  houseRenovation: number;
  houseArv: number;
  dadu: { sqft: number; buildCost: number; arv: number; note: string };
  images: CaseStudyImage[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "5519-12th-ave-ne",
    title: "A renovated house and a 1,000 sf DADU on the alley",
    address: "5519 12th Ave NE, Seattle, WA 98105",
    neighborhood: "Northeast Seattle",
    summary:
      "A 1907 house on a 4,000 sf lot with an alley behind it. The front house was renovated, and the largest DADU the code allows went in at the back, opening onto the alley.",
    // City records for parcel 3589500190 (ADUniverse parcels and feasibility factors).
    lot: { sqft: 4000, zoning: "NR3", widthFt: 40, depthFt: 100, alley: true, yearBuilt: 1907, pin: "3589500190" },
    purchase: 775_000,
    houseRenovation: 150_000,
    houseArv: 1_300_000,
    dadu: { sqft: 1000, buildCost: 300_000, arv: 700_000, note: "At the rear of the lot, opening onto the alley." },
    // PLACEHOLDER: the owner is supplying photos. Add them as public/case-studies/5519-12th-ave-ne/<name>.webp and set src.
    images: [
      { src: null, alt: "The front house at 5519 12th Ave NE before the renovation", caption: "The front house, before" },
      { src: null, alt: "The front house at 5519 12th Ave NE after the renovation", caption: "The front house, after" },
      { src: null, alt: "The 1,000 sf DADU at the rear of the lot, facing the alley", caption: "The DADU from the alley" },
      { src: null, alt: "Site plan of the lot with the house at the front and the DADU at the rear", caption: "Site plan" },
    ],
  },
];

export const caseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug) ?? null;

/** The deal's totals: what went in, what it is worth after, and the difference. */
export function caseStudyTotals(c: CaseStudy) {
  const invested = c.purchase + c.houseRenovation + c.dadu.buildCost;
  const arv = c.houseArv + c.dadu.arv;
  const equity = arv - invested;
  return {
    invested,
    arv,
    equity,
    returnOnCostPct: Math.round((equity / invested) * 100),
    daduBuildPerSf: Math.round(c.dadu.buildCost / c.dadu.sqft),
    daduArvPerSf: Math.round(c.dadu.arv / c.dadu.sqft),
    houseLift: c.houseArv - c.purchase - c.houseRenovation,
    daduLift: c.dadu.arv - c.dadu.buildCost,
  };
}
