import { PRODUCTS } from "@/lib/pricing";

/**
 * Cost assumptions for the Invest feed. The defaults below are the starting values; admins change them in
 * /admin/invest (stored in the `invest_settings` row), and visitors adjust them on each opportunity page.
 * Rent and resale are not assumed. TODO(comps): once the MLS feed is connected, DADU sale prices come from comps.
 */
export interface InvestAssumptions {
  /** Construction cost per sf of DADU. */
  buildCostPerSf: number;
  /** Pencil's custom plan. */
  planCost: number;
  /** Pencil's permit service. */
  permitCost: number;
  /** City permit and utility fees. */
  cityFees: number;
  /** Down payment on the purchase, percent of the list price. */
  downPaymentPct: number;
  /** Construction loan rate, percent per year. Used only when the build is financed. */
  interestRatePct: number;
  /** Off: the build and soft costs are paid in cash. On: the build is financed and a year of its interest is a cost. */
  financeConstruction: boolean;
}

export const DEFAULT_ASSUMPTIONS: InvestAssumptions = {
  buildCostPerSf: 450,
  planCost: PRODUCTS.custom_plan.amountCents / 100,
  permitCost: PRODUCTS.permit.amountCents / 100,
  cityFees: 15_000,
  downPaymentPct: 20,
  interestRatePct: 7,
  financeConstruction: false,
};

/** The editable numbers, their bounds and labels: one list drives the admin form, the sliders and validation. */
export const NUMBER_FIELDS = [
  { key: "buildCostPerSf", label: "Build cost per sq ft", min: 200, max: 900, step: 5, unit: "$" },
  { key: "planCost", label: "Pencil plan", min: 0, max: 50_000, step: 500, unit: "$" },
  { key: "permitCost", label: "Permit service", min: 0, max: 50_000, step: 500, unit: "$" },
  { key: "cityFees", label: "City fees", min: 0, max: 100_000, step: 1_000, unit: "$" },
  { key: "downPaymentPct", label: "Down payment", min: 0, max: 100, step: 1, unit: "%" },
  { key: "interestRatePct", label: "Construction loan rate", min: 0, max: 20, step: 0.25, unit: "%" },
] as const satisfies readonly { key: keyof InvestAssumptions; label: string; min: number; max: number; step: number; unit: "$" | "%" }[];

export type NumberField = (typeof NUMBER_FIELDS)[number];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Defaults overlaid with whatever valid values `raw` holds (a stored settings row, or form input). */
export function mergeAssumptions(raw: unknown): InvestAssumptions {
  const out: InvestAssumptions = { ...DEFAULT_ASSUMPTIONS };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  for (const f of NUMBER_FIELDS) {
    const v = typeof r[f.key] === "string" ? Number(r[f.key]) : r[f.key];
    if (typeof v === "number" && Number.isFinite(v)) out[f.key] = clamp(v, f.min, f.max);
  }
  if (typeof r.financeConstruction === "boolean") out.financeConstruction = r.financeConstruction;
  return out;
}
