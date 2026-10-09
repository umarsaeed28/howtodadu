/**
 * Pencil's one price list. The homepage, the paywall, checkout, the portal and the admin metrics all read it,
 * so a price changes in one place. Turnaround copy follows the guardrails: no approval promises, no timelines
 * for the city's part of the work.
 */
export type ProductKind = "feasibility_instant" | "feasibility_reviewed" | "custom_plan" | "permit";

export type Product = {
  kind: ProductKind;
  name: string;
  amountCents: number;
  turnaround: string;
  body: string;
  cta: string;
  popular?: boolean;
};

export const PRODUCTS: Record<ProductKind, Product> = {
  feasibility_instant: {
    kind: "feasibility_instant",
    name: "Instant Feasibility Report",
    amountCents: 20_000,
    turnaround: "Delivered instantly",
    body: "Your lot's full DADU picture: FAR, setbacks, height, lot coverage, and a site plan showing exactly where it fits.",
    cta: "Get my report",
  },
  feasibility_reviewed: {
    kind: "feasibility_reviewed",
    name: "Architect-Reviewed Feasibility",
    amountCents: 60_000,
    turnaround: "2 to 3 business days",
    body: "Everything in the instant report, plus a real person who looks at your lot, flags what the data can't see, and tells you the smartest DADU to build.",
    cta: "Get reviewed",
    popular: true,
  },
  custom_plan: {
    kind: "custom_plan",
    name: "Custom DADU Plan",
    amountCents: 300_000,
    turnaround: "Drawn for your lot",
    body: "Your footprint, your layout, finished by our licensed architects and designers. Starts from a code-checked draft, so nothing is wasted.",
    cta: "Start my plan",
  },
  permit: {
    kind: "permit",
    name: "Permit Service",
    amountCents: 500_000,
    turnaround: "SDCI submission to issued permit",
    body: "We prepare the set, submit it, and handle every round of corrections until your permit is in hand.",
    cta: "Get permitted",
  },
};

export const PRODUCT_ORDER: ProductKind[] = ["feasibility_instant", "feasibility_reviewed", "custom_plan", "permit"];

/**
 * Construction with Pencil, per square foot of DADU, in Seattle. Clients who build with us get the permit service
 * included: they pay for the architecture (the custom plan) and construction only.
 */
export const CONSTRUCTION_PER_SQFT = 375;

export const isProductKind = (v: unknown): v is ProductKind => typeof v === "string" && v in PRODUCTS;

/** "$200", "$3,000". Whole dollars only: every price here is round. */
export const price = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/** Business days from a date (Mon to Fri), for "Expect your review by [date]". */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d;
}

export const REVIEW_BUSINESS_DAYS = 3;

export const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
