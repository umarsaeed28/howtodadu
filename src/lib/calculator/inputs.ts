/**
 * Calculator form model: strings from the page, validated into `DealInputs` for the pure model.
 *
 * A proforma: the house (price, rehab, your ARV), the DADU, financing and holding costs, and the exit.
 * Rules that keep it honest:
 * - Defaults are the team's own rules only: $350/sf build, $50,000 soft costs, 6% selling costs, a 4 + 8 + 2 month
 *   timeline and a 10% construction rate. Market numbers (price, rents, caps) stay blank until entered.
 * - The sale price defaults to the house at break-even (price plus rehab, or your ARV) plus the DADU's resale value.
 * - Without a sale price or a rent, only cost results are produced.
 */
import { COST_PER_SF } from "@/lib/config/costs";
import { REHAB_RATES, SOFT_COSTS, daduEconomics, type RehabLevel } from "@/lib/dadu-value";
import {
  computeFeasibility,
  type DealInputs,
  type DealResult,
} from "@/lib/feasibility/model";

export type RehabChoice = RehabLevel | "custom";

export interface CalcForm {
  /** The existing house. */
  houseSqft: string;
  rehabLevel: RehabChoice;
  /** Custom rehab cost per sf of house, used when rehabLevel is "custom". */
  rehabPerSf: string;
  /** Your after-repair value for the house. Blank means break-even: price plus rehab. */
  houseArv: string;
  sf: string;
  costPerSf: string;
  siteWork: string;
  softPct: string;
  /** Flat soft costs in dollars (design, permits, fees, utilities). */
  softFlat: string;
  permits: string;
  contingencyPct: string;
  price: string;
  closingPct: string;
  permitMonths: string;
  buildMonths: string;
  exitMonths: string;
  ltcPct: string;
  /** A fixed loan amount; when set it replaces loan to cost. */
  loanAmount: string;
  ratePct: string;
  /** Holding costs while you own it, per month. */
  taxMonthly: string;
  insuranceMonthly: string;
  utilitiesMonthly: string;
  salePrice: string;
  /** "1" when selling costs are the standard 6%; otherwise sellingPct applies. */
  sellSix: string;
  sellingPct: string;
  rent: string;
  capPct: string;
  vacancyPct: string;
  opexPct: string;
  permLtvPct: string;
  permRatePct: string;
  permYears: string;
  minDscr: string;
}

export const FORM_KEYS = {
  houseSqft: "hsf",
  rehabLevel: "rehab",
  rehabPerSf: "rpsf",
  houseArv: "harv",
  sf: "sf",
  costPerSf: "cost",
  siteWork: "site",
  softPct: "soft",
  softFlat: "softf",
  permits: "permits",
  contingencyPct: "cont",
  price: "price",
  closingPct: "closing",
  permitMonths: "permit",
  buildMonths: "build",
  exitMonths: "exit",
  ltcPct: "ltc",
  loanAmount: "loan",
  ratePct: "rate",
  taxMonthly: "tax",
  insuranceMonthly: "ins",
  utilitiesMonthly: "util",
  salePrice: "sale",
  sellSix: "six",
  sellingPct: "sell",
  rent: "rent",
  capPct: "cap",
  vacancyPct: "vac",
  opexPct: "opex",
  permLtvPct: "pltv",
  permRatePct: "prate",
  permYears: "pyears",
  minDscr: "dscr",
} as const satisfies Record<keyof CalcForm, string>;

/** Team rules and underwriting conventions, shown in the form so they can be changed. */
export const DEFAULT_FORM: CalcForm = {
  houseSqft: "",
  rehabLevel: "none",
  rehabPerSf: "",
  houseArv: "",
  sf: "",
  costPerSf: String(COST_PER_SF),
  siteWork: "",
  softPct: "",
  softFlat: String(SOFT_COSTS),
  permits: "",
  contingencyPct: "",
  price: "",
  closingPct: "",
  permitMonths: "4",
  buildMonths: "8",
  exitMonths: "2",
  ltcPct: "",
  loanAmount: "",
  ratePct: "10",
  taxMonthly: "",
  insuranceMonthly: "",
  utilitiesMonthly: "",
  salePrice: "",
  sellSix: "1",
  sellingPct: "",
  rent: "",
  capPct: "",
  vacancyPct: "",
  opexPct: "",
  permLtvPct: "70",
  permRatePct: "6.75",
  permYears: "30",
  minDscr: "1.25",
};

export interface FieldError {
  field: keyof CalcForm;
  message: string;
}

type Spec = { min?: number; max?: number; int?: boolean; label: string };

/** Numeric fields. rehabLevel and sellSix are choices, not numbers. */
type NumericKey = Exclude<keyof CalcForm, "rehabLevel" | "sellSix">;

const SPECS: Record<NumericKey, Spec> = {
  houseSqft: { min: 0, max: 50_000, label: "House area" },
  rehabPerSf: { min: 0, max: 2000, label: "Rehab cost per sf" },
  houseArv: { min: 0, max: 100_000_000, label: "House ARV" },
  sf: { min: 1, max: 5000, label: "DADU area" },
  costPerSf: { min: 1, max: 5000, label: "Build cost per sf" },
  siteWork: { min: 0, max: 5_000_000, label: "Site work" },
  softPct: { min: 0, max: 100, label: "Soft costs" },
  softFlat: { min: 0, max: 5_000_000, label: "Soft costs" },
  permits: { min: 0, max: 5_000_000, label: "Permits and fees" },
  contingencyPct: { min: 0, max: 100, label: "Contingency" },
  price: { min: 0, max: 100_000_000, label: "Purchase price" },
  closingPct: { min: 0, max: 100, label: "Closing costs" },
  permitMonths: { min: 0, max: 120, int: true, label: "Permit months" },
  buildMonths: { min: 0, max: 120, int: true, label: "Build months" },
  exitMonths: { min: 0, max: 120, int: true, label: "Sale or lease-up months" },
  ltcPct: { min: 0, max: 100, label: "Loan to cost" },
  loanAmount: { min: 0, max: 100_000_000, label: "Loan amount" },
  ratePct: { min: 0, max: 100, label: "Interest rate" },
  taxMonthly: { min: 0, max: 100_000, label: "Property tax" },
  insuranceMonthly: { min: 0, max: 100_000, label: "Insurance" },
  utilitiesMonthly: { min: 0, max: 100_000, label: "Utilities and upkeep" },
  salePrice: { min: 0, max: 100_000_000, label: "Sale price" },
  sellingPct: { min: 0, max: 100, label: "Selling costs" },
  rent: { min: 0, max: 1_000_000, label: "Monthly rent" },
  capPct: { min: 0.1, max: 100, label: "Cap rate" },
  vacancyPct: { min: 0, max: 100, label: "Vacancy" },
  opexPct: { min: 0, max: 100, label: "Operating cost ratio" },
  permLtvPct: { min: 1, max: 100, label: "Refinance loan to value" },
  permRatePct: { min: 0, max: 100, label: "Refinance rate" },
  permYears: { min: 1, max: 50, int: true, label: "Amortization years" },
  minDscr: { min: 0.5, max: 10, label: "Minimum debt coverage" },
};

/** Parse a form string: blank is "not provided", commas and $ are ignored. */
export function parseNumber(raw: string): number | null {
  const t = raw.replace(/[$,\s%]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export interface ParsedCalc {
  errors: FieldError[];
  /** Cost-only results exist once the area and the build cost are valid. */
  ready: boolean;
  sf: number;
  costPerSf: number;
  /** sf × cost per sf, whole dollars. */
  construction: number;
  /** Rehab of the existing house: rate per sf and the total, from the level or the custom rate. */
  rehab: { rate: number; cost: number; houseSqft: number };
  /** The sale price the proforma uses when none is typed: house ARV (or break-even) plus the DADU's resale value. */
  autoSalePrice: number | null;
  /** The parts of that: the house side and the DADU side. */
  autoSaleParts: { house: number; dadu: number; houseIsOwn: boolean } | null;
  /** Selling costs in effect, percent. */
  sellingPct: number;
  hasPrice: boolean;
  hasSale: boolean;
  hasRent: boolean;
  /** Result for the cost side, and for each exit the user provided a value for. */
  costOnly: DealResult | null;
  sale: { inputs: DealInputs; result: DealResult } | null;
  rent: { inputs: DealInputs; result: DealResult } | null;
}

function num(form: CalcForm, k: NumericKey, errors: FieldError[]): number | null {
  const n = parseNumber(form[k]);
  if (n === null) return null;
  const spec = SPECS[k];
  if (Number.isNaN(n)) {
    errors.push({ field: k, message: `${spec.label} must be a number.` });
    return null;
  }
  if (spec.min !== undefined && n < spec.min) {
    errors.push({ field: k, message: `${spec.label} must be at least ${spec.min}.` });
    return null;
  }
  if (spec.max !== undefined && n > spec.max) {
    errors.push({ field: k, message: `${spec.label} must be at most ${spec.max.toLocaleString("en-US")}.` });
    return null;
  }
  if (spec.int && !Number.isInteger(n)) {
    errors.push({ field: k, message: `${spec.label} must be a whole number.` });
    return null;
  }
  return n;
}

export function parseForm(form: CalcForm): ParsedCalc {
  const errors: FieldError[] = [];
  const v = (k: NumericKey) => num(form, k, errors);

  const sf = v("sf");
  const costPerSf = v("costPerSf");
  const price = v("price");
  const sale = v("salePrice");
  const rent = v("rent");
  const cap = v("capPct");

  // Validate every field so all errors show at once.
  for (const k of Object.keys(SPECS) as NumericKey[]) {
    if (!["sf", "costPerSf", "price", "salePrice", "rent", "capPct"].includes(k)) v(k);
  }

  // The existing house: rehab cost from the level (or a custom rate) times its area.
  const houseSqft = v("houseSqft") ?? 0;
  const rehabRate = form.rehabLevel === "custom" ? v("rehabPerSf") ?? 0 : REHAB_RATES[form.rehabLevel] ?? 0;
  const rehab = { rate: rehabRate, cost: Math.round(houseSqft * rehabRate), houseSqft };
  // Selling costs: the standard 6%, or whatever was typed.
  const sellingPct = form.sellSix === "1" ? 6 : v("sellingPct") ?? 0;
  // Sale price when none is typed: the house at your ARV (or break-even) plus what the DADU sells for.
  const ownArv = v("houseArv");
  const dadu = sf ? daduEconomics(sf, costPerSf ?? undefined) : null;
  const houseSide = ownArv != null && ownArv > 0 ? ownArv : price != null && price > 0 ? price + rehab.cost : null;
  const autoSaleParts = dadu && houseSide != null ? { house: houseSide, dadu: dadu.saleValue, houseIsOwn: ownArv != null && ownArv > 0 } : dadu && price == null ? { house: 0, dadu: dadu.saleValue, houseIsOwn: false } : null;
  const autoSalePrice = autoSaleParts ? autoSaleParts.house + autoSaleParts.dadu : null;

  const ready = sf !== null && costPerSf !== null && errors.length === 0;
  const empty: ParsedCalc = {
    errors,
    ready: false,
    sf: sf ?? 0,
    costPerSf: costPerSf ?? 0,
    construction: 0,
    rehab,
    autoSalePrice,
    autoSaleParts,
    sellingPct,
    hasPrice: false,
    hasSale: false,
    hasRent: false,
    costOnly: null,
    sale: null,
    rent: null,
  };
  if (!ready || sf === null || costPerSf === null) {
    if (sf === null && !errors.some((e) => e.field === "sf")) {
      /* area not entered yet: not an error, the page prompts for it */
    }
    return empty;
  }

  const o = (k: NumericKey) => v(k) ?? 0;
  const loan = v("loanAmount");
  const base = (strategy: DealInputs["exit"]["strategy"]): DealInputs => ({
    acquisition: { purchasePrice: price ?? 0, closingCostsPct: o("closingPct"), demoSitePrep: o("siteWork") },
    hard: {
      buildableSqft: sf,
      costPerSqft: costPerSf,
      rehabSqft: houseSqft,
      rehabCostPerSqft: rehabRate,
      contingencyPct: o("contingencyPct"),
    },
    soft: {
      architecturePct: o("softPct"),
      engineeringPct: 0,
      permitsAndFees: o("permits"),
      surveyEnviro: 0,
      projectMgmtPct: 0,
      legalAccounting: 0,
      insurancePct: 0,
      otherFlat: o("softFlat"),
    },
    financing: {
      loanToCostPct: o("ltcPct"),
      loanAmount: loan != null && loan > 0 ? loan : undefined,
      interestRatePct: o("ratePct"),
      buildMonths: o("buildMonths"),
      propertyTaxMonthly: o("taxMonthly") + o("insuranceMonthly"),
      utilitiesMaintMonthly: o("utilitiesMonthly"),
      permitMonths: o("permitMonths"),
      exitMonths: o("exitMonths"),
    },
    exit: { strategy, sellingCostsPct: 0 },
    units: 1,
  });

  const costOnlyInputs = base("sell_finished");
  const costOnly = computeFeasibility(costOnlyInputs);

  // The sale case: the typed price, else the auto price (house ARV or break-even plus the DADU's resale value).
  const salePrice = sale !== null && sale > 0 ? sale : autoSalePrice;
  let saleOut: ParsedCalc["sale"] = null;
  if (salePrice != null && salePrice > 0) {
    const inputs = base("sell_finished");
    inputs.exit = { strategy: "sell_finished", salePricePerUnit: salePrice, sellingCostsPct: sellingPct };
    saleOut = { inputs, result: computeFeasibility(inputs) };
  }

  let rentOut: ParsedCalc["rent"] = null;
  if (rent !== null && rent > 0 && cap !== null) {
    const inputs = base("hold_rent");
    inputs.exit = {
      strategy: "hold_rent",
      rentPerUnitMonthly: rent,
      capRatePct: cap,
      vacancyPct: o("vacancyPct"),
      opexRatioPct: o("opexPct"),
      permLtvPct: v("permLtvPct") ?? 70,
      permRatePct: v("permRatePct") ?? 6.75,
      permAmortYears: v("permYears") ?? 30,
      minDscr: v("minDscr") ?? 1.25,
      // Value created is stabilized value minus cost, so no sale costs are charged on a hold.
      sellingCostsPct: 0,
    };
    rentOut = { inputs, result: computeFeasibility(inputs) };
  }

  const construction = Math.round(sf * costPerSf);
  return {
    errors,
    ready: errors.length === 0,
    sf,
    costPerSf,
    construction,
    rehab,
    autoSalePrice,
    autoSaleParts,
    sellingPct,
    hasPrice: price !== null && price > 0,
    hasSale: saleOut !== null,
    hasRent: rentOut !== null,
    costOnly,
    sale: saleOut,
    rent: rentOut,
  };
}

/** Serialize only values that differ from the defaults, so shared links stay short. */
export function toSearchParams(form: CalcForm, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, key] of Object.entries(FORM_KEYS) as [keyof CalcForm, string][]) {
    if (form[k] !== DEFAULT_FORM[k]) p.set(key, form[k].trim());
  }
  for (const [k, val] of Object.entries(extra)) if (val) p.set(k, val);
  return p;
}

const REHAB_CHOICES: RehabChoice[] = ["none", "light", "moderate", "heavy", "custom"];

export function fromSearchParams(params: URLSearchParams | Record<string, string | string[] | undefined>): CalcForm {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const form: CalcForm = { ...DEFAULT_FORM };
  for (const [k, key] of Object.entries(FORM_KEYS) as [keyof CalcForm, string][]) {
    const raw = get(key);
    if (raw === undefined || raw.length > 24) continue;
    if (k === "rehabLevel") {
      if ((REHAB_CHOICES as string[]).includes(raw)) form.rehabLevel = raw as RehabChoice;
    } else form[k] = raw;
  }
  return form;
}

/** Link the report, the listing page and the map use to open the proforma prefilled with what they know. */
export function calculatorHref(opts: {
  sf?: number | null;
  address?: string | null;
  price?: number | null;
  houseSqft?: number | null;
  rehab?: RehabLevel | null;
  houseArv?: number | null;
}): string {
  const p = new URLSearchParams();
  if (opts.sf && opts.sf > 0) p.set("sf", String(Math.round(opts.sf)));
  if (opts.address) p.set("addr", opts.address);
  if (opts.price && opts.price > 0) p.set(FORM_KEYS.price, String(Math.round(opts.price)));
  if (opts.houseSqft && opts.houseSqft > 0) p.set(FORM_KEYS.houseSqft, String(Math.round(opts.houseSqft)));
  if (opts.rehab && opts.rehab !== "none") p.set(FORM_KEYS.rehabLevel, opts.rehab);
  if (opts.houseArv && opts.houseArv > 0) p.set(FORM_KEYS.houseArv, String(Math.round(opts.houseArv)));
  const q = p.toString();
  return q ? `/calculator?${q}` : "/calculator";
}
