/**
 * Calculator form model: strings from the page, validated into `DealInputs` for the pure model.
 *
 * Rules that keep it honest:
 * - Only the build cost ($350/sf) has a default. Everything else is blank until the user enters it,
 *   and blank means zero or "not provided", never a guessed market number.
 * - Without a sale price or a rent, only cost results are produced.
 */
import { COST_PER_SF } from "@/lib/config/costs";
import {
  computeFeasibility,
  type DealInputs,
  type DealResult,
} from "@/lib/feasibility/model";

export interface CalcForm {
  sf: string;
  costPerSf: string;
  siteWork: string;
  softPct: string;
  permits: string;
  contingencyPct: string;
  price: string;
  closingPct: string;
  permitMonths: string;
  buildMonths: string;
  exitMonths: string;
  ltcPct: string;
  ratePct: string;
  salePrice: string;
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
  sf: "sf",
  costPerSf: "cost",
  siteWork: "site",
  softPct: "soft",
  permits: "permits",
  contingencyPct: "cont",
  price: "price",
  closingPct: "closing",
  permitMonths: "permit",
  buildMonths: "build",
  exitMonths: "exit",
  ltcPct: "ltc",
  ratePct: "rate",
  salePrice: "sale",
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

/** Refinance terms are underwriting conventions, shown in the form so they can be changed. */
export const DEFAULT_FORM: CalcForm = {
  sf: "",
  costPerSf: String(COST_PER_SF),
  siteWork: "",
  softPct: "",
  permits: "",
  contingencyPct: "",
  price: "",
  closingPct: "",
  permitMonths: "",
  buildMonths: "",
  exitMonths: "",
  ltcPct: "",
  ratePct: "",
  salePrice: "",
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

const SPECS: Record<keyof CalcForm, Spec> = {
  sf: { min: 1, max: 5000, label: "DADU area" },
  costPerSf: { min: 1, max: 5000, label: "Build cost per sf" },
  siteWork: { min: 0, max: 5_000_000, label: "Site work" },
  softPct: { min: 0, max: 100, label: "Soft costs" },
  permits: { min: 0, max: 5_000_000, label: "Permits and fees" },
  contingencyPct: { min: 0, max: 100, label: "Contingency" },
  price: { min: 0, max: 100_000_000, label: "Purchase price" },
  closingPct: { min: 0, max: 100, label: "Closing costs" },
  permitMonths: { min: 0, max: 120, int: true, label: "Permit months" },
  buildMonths: { min: 0, max: 120, int: true, label: "Build months" },
  exitMonths: { min: 0, max: 120, int: true, label: "Sale or lease-up months" },
  ltcPct: { min: 0, max: 100, label: "Loan to cost" },
  ratePct: { min: 0, max: 100, label: "Interest rate" },
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
  hasPrice: boolean;
  hasSale: boolean;
  hasRent: boolean;
  /** Result for the cost side, and for each exit the user provided a value for. */
  costOnly: DealResult | null;
  sale: { inputs: DealInputs; result: DealResult } | null;
  rent: { inputs: DealInputs; result: DealResult } | null;
}

function num(form: CalcForm, k: keyof CalcForm, errors: FieldError[]): number | null {
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
  const v = (k: keyof CalcForm) => num(form, k, errors);

  const sf = v("sf");
  const costPerSf = v("costPerSf");
  const price = v("price");
  const sale = v("salePrice");
  const rent = v("rent");
  const cap = v("capPct");

  // Validate every field so all errors show at once.
  for (const k of Object.keys(SPECS) as (keyof CalcForm)[]) {
    if (!["sf", "costPerSf", "price", "salePrice", "rent", "capPct"].includes(k)) v(k);
  }

  const ready = sf !== null && costPerSf !== null && errors.length === 0;
  const empty: ParsedCalc = {
    errors,
    ready: false,
    sf: sf ?? 0,
    costPerSf: costPerSf ?? 0,
    construction: 0,
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

  const o = (k: keyof CalcForm) => v(k) ?? 0;
  const base = (strategy: DealInputs["exit"]["strategy"]): DealInputs => ({
    acquisition: { purchasePrice: price ?? 0, closingCostsPct: o("closingPct"), demoSitePrep: o("siteWork") },
    hard: {
      buildableSqft: sf,
      costPerSqft: costPerSf,
      rehabSqft: 0,
      rehabCostPerSqft: 0,
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
    },
    financing: {
      loanToCostPct: o("ltcPct"),
      interestRatePct: o("ratePct"),
      buildMonths: o("buildMonths"),
      propertyTaxMonthly: 0,
      utilitiesMaintMonthly: 0,
      permitMonths: o("permitMonths"),
      exitMonths: o("exitMonths"),
    },
    exit: { strategy, sellingCostsPct: 0 },
    units: 1,
  });

  const costOnlyInputs = base("sell_finished");
  const costOnly = computeFeasibility(costOnlyInputs);

  let saleOut: ParsedCalc["sale"] = null;
  if (sale !== null && sale > 0) {
    const inputs = base("sell_finished");
    inputs.exit = { strategy: "sell_finished", salePricePerUnit: sale, sellingCostsPct: o("sellingPct") };
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
    if (form[k] !== DEFAULT_FORM[k] && form[k].trim() !== "") p.set(key, form[k].trim());
  }
  for (const [k, val] of Object.entries(extra)) if (val) p.set(k, val);
  return p;
}

export function fromSearchParams(params: URLSearchParams | Record<string, string | string[] | undefined>): CalcForm {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const form: CalcForm = { ...DEFAULT_FORM };
  for (const [k, key] of Object.entries(FORM_KEYS) as [keyof CalcForm, string][]) {
    const raw = get(key);
    if (raw !== undefined && raw.length <= 24) form[k] = raw;
  }
  return form;
}

/** Link the report and the map use to open the calculator prefilled with a design's area. */
export function calculatorHref(opts: { sf?: number | null; address?: string | null }): string {
  const p = new URLSearchParams();
  if (opts.sf && opts.sf > 0) p.set("sf", String(Math.round(opts.sf)));
  if (opts.address) p.set("addr", opts.address);
  const q = p.toString();
  return q ? `/calculator?${q}` : "/calculator";
}
