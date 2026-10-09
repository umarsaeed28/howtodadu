/**
 * The proforma's inputs: one zod schema for the page, the database and the exports. Money is integer cents,
 * percentages are percent (6.75, not 0.0675), months are whole months.
 *
 * Defaults are only Pencil's own conventions and sourced facts (content/claims.json, ids in `DEFAULT_SOURCES`).
 * Market numbers (price, rent, property tax, permit fees) have no default: they are 0 until entered, and
 * `requiredMissing()` says which ones still are.
 */
import { z } from "zod";
import claims from "../../../content/claims.json";

export const ENGINE_VERSION = "1.0.0";

const cents = z.number().int().min(0);
const pct = z.number().min(0).max(100);
const months = z.number().int().min(0).max(240);

export const Strategy = z.enum(["rent_hold", "sell", "refi_hold"]);
export type Strategy = z.infer<typeof Strategy>;
export const STRATEGY_LABELS: Record<Strategy, string> = { rent_hold: "Build to rent, hold", sell: "Build to sell", refi_hold: "Build, refinance, hold" };

export const Scenario = z.enum(["base", "downside", "upside"]);
export type Scenario = z.infer<typeof Scenario>;

const claim = (id: string) => {
  const c = claims.claims.find((x) => x.id === id);
  if (!c) throw new Error(`content/claims.json has no claim ${id}`);
  return c as (typeof claims.claims)[number] & { value: Record<string, unknown> | null };
};
const fin = claim("pencil_financing_defaults").value as Record<string, number>;
const tl = claim("pencil_timeline_defaults").value as Record<string, number>;
const hard = claim("pencil_hard_cost_per_sf").value as { centsPerSf: number };
const localReet = claim("reet_local_seattle").value as { pct: number };

/** Which claim each default comes from, for tooltips and the Notes & Sources export tab. */
export const DEFAULT_SOURCES: Record<string, string> = {
  "budget.hardPerSf": "pencil_hard_cost_per_sf",
  "acquisition.reetLocalPct": "reet_local_seattle",
  "acquisition.buyerPaysReet": "reet_seller_pays",
  "timeline.designMo": "pencil_timeline_defaults",
  "timeline.permitMo": "pencil_timeline_defaults",
  "timeline.buildMo": "pencil_timeline_defaults",
  "timeline.leaseUpOrSaleMo": "pencil_timeline_defaults",
  "financing.construction.ratePct": "pencil_financing_defaults",
  "financing.construction.pointsPct": "pencil_financing_defaults",
  "financing.perm.ltvPct": "pencil_financing_defaults",
  "financing.perm.ratePct": "pencil_financing_defaults",
  "financing.perm.amortYears": "pencil_financing_defaults",
  "financing.perm.minDscr": "pencil_financing_defaults",
  "growthExit.sellingPct": "pencil_financing_defaults",
  "operations.vacancyPct": "pencil_financing_defaults",
  "operations.mgmtPct": "pencil_financing_defaults",
  "budget.hardContPct": "pencil_financing_defaults",
  "tax.depreciationYears": "irs_residential_depreciation",
  "operations.propertyTaxAnnual": "king_county_property_tax",
  "budget.permitsSdci": "sdci_permit_fees",
};

export const Unit = z.object({
  label: z.string().default("DADU"),
  /** Monthly rent, cents. */
  rent: cents.default(0),
  /** Other monthly income for this unit (parking, storage), cents. */
  otherIncome: cents.default(0),
});

export const ProformaInputs = z.object({
  version: z.literal("1").default("1"),
  meta: z.object({
    title: z.string().max(120).default(""),
    address: z.string().max(200).default(""),
    pin: z.string().nullable().default(null),
    strategy: Strategy.default("rent_hold"),
    scenario: Scenario.default("base"),
    /** Month 0 of the model, ISO date. Drives REET schedules and XIRR dates. */
    closingDate: z.iso.date().default("2026-10-01"),
  }).prefault({}),
  acquisition: z.object({
    ownership: z.enum(["buy", "owned"]).default("buy"),
    purchasePrice: cents.default(0),
    /** When already owned: the property's value today, carried as owner equity. */
    currentValue: cents.default(0),
    closingPct: pct.default(0),
    buyerPaysReet: z.boolean().default(false),
    /** Local REET add-on, percent of price (Seattle 0.50). */
    reetLocalPct: pct.default(localReet.pct),
    dueDiligence: cents.default(0),
  }).prefault({}),
  budget: z.object({
    sqft: z.number().min(0).max(5000).default(0),
    sqftSource: z.enum(["far_engine", "drawn", "manual"]).default("manual"),
    /** Hard cost per square foot, cents. */
    hardPerSf: cents.default(hard.centsPerSf),
    siteWork: cents.default(0),
    utilities: z.object({ sewer: cents.default(0), water: cents.default(0), power: cents.default(0), sideSewer: cents.default(0) }).prefault({}),
    design: cents.default(0),
    engineering: cents.default(0),
    survey: cents.default(0),
    permitsSdci: cents.default(0),
    legal: cents.default(0),
    /** Unit lot subdivision, charged at completion when selling a unit on its own lot. */
    subdivision: cents.default(0),
    builderFeePct: pct.default(0),
    developerFeePct: pct.default(0),
    hardContPct: pct.default(fin.hardContPct),
    softContPct: pct.default(0),
  }).prefault({}),
  timeline: z.object({
    designMo: months.default(tl.designMo),
    permitMo: months.default(tl.permitMo),
    buildMo: z.number().int().min(1).max(60).default(tl.buildMo),
    leaseUpOrSaleMo: months.default(tl.leaseUpOrSaleMo),
    drawCurve: z.enum(["straight", "scurve"]).default("scurve"),
  }).prefault({}),
  financing: z.object({
    mode: z.enum(["all_cash", "construction_loan"]).default("construction_loan"),
    construction: z.object({
      ltcPct: pct.default(0),
      ratePct: pct.default(fin.constructionRatePct),
      pointsPct: pct.default(fin.pointsPct),
      /** Interest capitalized into the loan during the build (a Use the loan funds). Off: paid monthly from equity. */
      interestReserve: z.boolean().default(true),
    }).prefault({}),
    perm: z.object({
      ltvPct: pct.default(fin.permLtvPct),
      ratePct: pct.default(fin.permRatePct),
      amortYears: z.number().int().min(1).max(40).default(fin.amortYears),
      minDscr: z.number().min(0.5).max(5).default(fin.minDscr),
    }).prefault({}),
    /** LP/GP split. Null: one owner, no waterfall. */
    equity: z.object({
      lpPct: pct.default(90),
      /** Preferred return, percent per year, paid pro rata to all equity before any promote. */
      prefPct: pct.default(8),
      /** Promote tiers above the pref, in order: once equity's IRR reaches the hurdle, the next tier's split applies. */
      tiers: z.array(z.object({ hurdleIrrPct: pct, lpSharePct: pct })).max(4).default([]),
    }).nullable().default(null),
  }).prefault({}),
  operations: z.object({
    units: z.array(Unit).min(1).max(12).default([{ label: "DADU", rent: 0, otherIncome: 0 }]),
    vacancyPct: pct.default(fin.vacancyPct),
    /** The parcel's actual annual property tax, cents. No default (king_county_property_tax). */
    propertyTaxAnnual: cents.default(0),
    insuranceAnnual: cents.default(0),
    utilitiesAnnual: cents.default(0),
    /** Repairs and maintenance, percent of effective gross income. */
    repairsPct: pct.default(0),
    capexReserveAnnual: cents.default(0),
    mgmtPct: pct.default(fin.mgmtPct),
    hoaAnnual: cents.default(0),
  }).prefault({}),
  growthExit: z.object({
    rentGrowthPct: z.number().min(-20).max(20).default(0),
    expenseGrowthPct: z.number().min(-20).max(20).default(0),
    holdYears: z.number().int().min(1).max(30).default(10),
    /** Cap rate for the exit value and for sizing the permanent loan, percent. */
    exitCapPct: z.number().min(0.5).max(20).default(0),
    sellingPct: pct.default(fin.sellingPct),
    sale: z.object({
      /** "unit": the new unit on its own unit lot, keeping the house; "whole": the whole property. */
      scope: z.enum(["unit", "whole"]).default("unit"),
      unitPrice: cents.default(0),
      wholePrice: cents.default(0),
      /** Unit scope: what the house kept is worth at the sale, carried as retained value (not sold, no selling costs). */
      houseValue: cents.default(0),
    }).prefault({}),
  }).prefault({}),
  tax: z.object({
    enabled: z.boolean().default(false),
    /** Land share of the purchase price, percent (not depreciable). */
    landSharePct: pct.default(0),
    depreciationYears: z.number().min(1).max(50).default(27.5),
    marginalRatePct: pct.default(0),
  }).prefault({}),
});
export type ProformaInputs = z.infer<typeof ProformaInputs>;

/** A full input object with every default applied. */
export const defaultInputs = (): ProformaInputs => ProformaInputs.parse({});

/** Parse anything (a saved row, a URL) into inputs, filling defaults; throws on bad shapes. */
export const parseInputs = (raw: unknown): ProformaInputs => ProformaInputs.parse(raw);

export type MissingField = { path: string; label: string; claim: string | null };

/**
 * Required market inputs still at zero. The engine runs without them (results are shown live), but every output
 * is marked incomplete until these are entered, and exports refuse.
 */
export function requiredMissing(i: ProformaInputs): MissingField[] {
  const out: MissingField[] = [];
  if (i.acquisition.ownership === "buy" && i.acquisition.purchasePrice === 0) out.push({ path: "acquisition.purchasePrice", label: "Purchase price", claim: null });
  if (i.acquisition.ownership === "owned" && i.acquisition.currentValue === 0) out.push({ path: "acquisition.currentValue", label: "Current value", claim: null });
  if (i.budget.sqft === 0) out.push({ path: "budget.sqft", label: "DADU area", claim: null });
  if (i.operations.propertyTaxAnnual === 0) out.push({ path: "operations.propertyTaxAnnual", label: "Annual property tax", claim: "king_county_property_tax" });
  if (i.budget.permitsSdci === 0) out.push({ path: "budget.permitsSdci", label: "SDCI permit fees", claim: "sdci_permit_fees" });
  if (i.meta.strategy !== "sell") {
    if (i.operations.units.every((u) => u.rent === 0)) out.push({ path: "operations.units.0.rent", label: "Monthly rent", claim: null });
    if (i.growthExit.exitCapPct === 0) out.push({ path: "growthExit.exitCapPct", label: "Exit cap rate", claim: null });
  } else {
    if ((i.growthExit.sale.scope === "unit" ? i.growthExit.sale.unitPrice : i.growthExit.sale.wholePrice) === 0) out.push({ path: "growthExit.sale.unitPrice", label: "Sale price", claim: null });
    if (i.growthExit.sale.scope === "unit" && i.growthExit.sale.houseValue === 0) out.push({ path: "growthExit.sale.houseValue", label: "Value of the house you keep", claim: null });
  }
  return out;
}
