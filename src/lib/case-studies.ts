/**
 * Pencil's case studies. Every figure here comes from the project owner; nothing is estimated by the site.
 * ARV is the after-repair value. Equity and return on cost are before financing, holding and selling costs.
 * Rent figures are gross: before vacancy, utilities, taxes, insurance, upkeep and financing, which the owner did
 * not supply, so no net return is shown.
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
  /** Room-by-room rental: bedrooms in each building and the rent per room per month. */
  rental: { houseBeds: number; basementBeds: number; daduBeds: number; rentPerRoom: number; tenants: string };
  images: CaseStudyImage[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "5519-12th-ave-ne",
    title: "12 student rooms from one lot: a renovated house and a 1,000 sf DADU",
    address: "5519 12th Ave NE, Seattle, WA 98105",
    neighborhood: "Northeast Seattle",
    summary:
      "A 1907 house on a 4,000 sf lot with an alley behind it. The unfinished basement became three more bedrooms, making the front house nine, and a three-bedroom, 1,000 sf DADU went in at the back. All 12 rooms rent to University of Washington students at $1,300 each.",
    // City records for parcel 3589500190 (ADUniverse parcels and feasibility factors).
    lot: { sqft: 4000, zoning: "NR3", widthFt: 40, depthFt: 100, alley: true, yearBuilt: 1907, pin: "3589500190" },
    purchase: 775_000,
    houseRenovation: 150_000,
    houseArv: 1_300_000,
    dadu: { sqft: 1000, buildCost: 300_000, arv: 700_000, note: "Three bedrooms at the rear of the lot, opening onto the alley." },
    rental: { houseBeds: 9, basementBeds: 3, daduBeds: 3, rentPerRoom: 1_300, tenants: "University of Washington students" },
    // More photos go in public/case-studies/5519-12th-ave-ne/ as the owner supplies them.
    images: [
      {
        src: "/case-studies/5519-12th-ave-ne/rendering.webp",
        alt: "Isometric rendering of a craftsman house at the front of the lot and a modern two-story DADU at the back",
        caption: "Concept rendering: the renovated front house and the DADU at the back of the lot",
      },
    ],
  },
];

export const caseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug) ?? null;

/** The deal's totals: what went in, what it is worth after, the difference, and what the rooms rent for. */
export function caseStudyTotals(c: CaseStudy) {
  const invested = c.purchase + c.houseRenovation + c.dadu.buildCost;
  const arv = c.houseArv + c.dadu.arv;
  const equity = arv - invested;
  const rooms = c.rental.houseBeds + c.rental.daduBeds;
  const monthlyRent = rooms * c.rental.rentPerRoom;
  const annualRent = monthlyRent * 12;
  const oneDecimal = (n: number) => Math.round(n * 10) / 10;
  return {
    invested,
    arv,
    equity,
    returnOnCostPct: Math.round((equity / invested) * 100),
    daduBuildPerSf: Math.round(c.dadu.buildCost / c.dadu.sqft),
    daduArvPerSf: Math.round(c.dadu.arv / c.dadu.sqft),
    houseLift: c.houseArv - c.purchase - c.houseRenovation,
    daduLift: c.dadu.arv - c.dadu.buildCost,
    rooms,
    monthlyRent,
    annualRent,
    /** Gross annual rent over the total invested, percent. */
    grossYieldPct: oneDecimal((annualRent / invested) * 100),
    /** Gross annual rent over the combined after-repair value, percent. */
    yieldOnValuePct: oneDecimal((annualRent / arv) * 100),
    /** Years of gross rent to repay the total invested. */
    paybackYears: oneDecimal(invested / annualRent),
  };
}
