/**
 * The development budget and Sources & Uses, before financing is sized. Every line is cents; the percentages and
 * per-sf figures are derived at the end so the lines themselves stay exact.
 *
 * Fees and contingencies, as defined here (and mirrored in the Excel export):
 *   hard base   = sqft x hard $/sf + site work + utility connections
 *   soft base   = design + engineering + survey + SDCI permits + legal + subdivision
 *   builder fee = builderFeePct x hard base
 *   dev fee     = developerFeePct x (hard base + soft base)
 *   hard cont.  = hardContPct x hard base;  soft cont. = softContPct x soft base
 */
import type { ProformaInputs } from "./schema";
import { pctOf, roundCents, sum, type Cents } from "./money";
import { reet } from "./reet";

export type BudgetGroup = "acquisition" | "hard" | "soft" | "fees" | "contingency" | "financing" | "carry";

export interface BudgetLine {
  key: string;
  label: string;
  group: BudgetGroup;
  amount: Cents;
  /** Percent of the total development cost (filled by `withShares`). */
  pctOfTotal: number;
  /** Dollars per DADU square foot, cents (filled by `withShares`; null when sqft is 0). */
  perSf: Cents | null;
  /** Where the number came from, for the tooltip and the Notes tab. */
  basis: string;
}

export interface CoreBudget {
  lines: BudgetLine[];
  acquisition: Cents;
  hardBase: Cents;
  softBase: Cents;
  fees: Cents;
  contingency: Cents;
  /** Everything above financing and carry: what the loan and equity must fund before interest. */
  developmentCost: Cents;
}

const line = (key: string, label: string, group: BudgetGroup, amount: Cents, basis: string): BudgetLine => ({ key, label, group, amount, pctOfTotal: 0, perSf: null, basis });

/** Budget lines that do not depend on the loan. Financing and carry lines are added by the strategy module. */
export function coreBudget(i: ProformaInputs): CoreBudget {
  const a = i.acquisition, b = i.budget;
  const lines: BudgetLine[] = [];
  const buy = a.ownership === "buy";
  const basisPrice = buy ? a.purchasePrice : a.currentValue;
  lines.push(line("land", buy ? "Purchase price" : "Existing property, at current value", "acquisition", basisPrice, buy ? "Entered" : "Entered; carried as owner equity, not cash"));
  if (buy && a.closingPct > 0) lines.push(line("closing", "Closing costs", "acquisition", pctOf(a.purchasePrice, a.closingPct), `${a.closingPct}% of price`));
  if (buy && a.buyerPaysReet) {
    const r = reet(a.purchasePrice, i.meta.closingDate, a.reetLocalPct);
    lines.push(line("reet_buy", "REET, paid by buyer", "acquisition", r.total, `State graduated + ${a.reetLocalPct}% local (reet_state_tiers_2023, reet_local_seattle)`));
  }
  if (a.dueDiligence > 0) lines.push(line("dd", "Due diligence", "acquisition", a.dueDiligence, "Entered"));

  const construction = roundCents(b.sqft * b.hardPerSf);
  lines.push(line("construction", "Construction", "hard", construction, `${b.sqft} sf x $${(b.hardPerSf / 100).toLocaleString("en-US")}/sf`));
  if (b.siteWork > 0) lines.push(line("site", "Site work", "hard", b.siteWork, "Entered"));
  const util = b.utilities;
  const utilTotal = util.sewer + util.water + util.power + util.sideSewer;
  if (utilTotal > 0) lines.push(line("utilities", "Utility connections", "hard", utilTotal, "Sewer, water, power, side sewer"));
  const hardBase = construction + b.siteWork + utilTotal;

  const softItems: [string, string, Cents][] = [["design", "Design and architecture", b.design], ["engineering", "Engineering", b.engineering], ["survey", "Survey", b.survey], ["permits", "Permits and SDCI fees", b.permitsSdci], ["legal", "Legal", b.legal], ["subdivision", "Unit lot subdivision", b.subdivision]];
  for (const [k, l, v] of softItems) if (v > 0) lines.push(line(k, l, "soft", v, "Entered"));
  const softBase = sum(softItems.map((x) => x[2]));

  const builderFee = pctOf(hardBase, b.builderFeePct);
  const devFee = pctOf(hardBase + softBase, b.developerFeePct);
  if (builderFee > 0) lines.push(line("builder_fee", "Builder fee", "fees", builderFee, `${b.builderFeePct}% of hard costs`));
  if (devFee > 0) lines.push(line("dev_fee", "Developer fee", "fees", devFee, `${b.developerFeePct}% of hard and soft costs`));
  const hardCont = pctOf(hardBase, b.hardContPct);
  const softCont = pctOf(softBase, b.softContPct);
  if (hardCont > 0) lines.push(line("hard_cont", "Hard cost contingency", "contingency", hardCont, `${b.hardContPct}% of hard costs`));
  if (softCont > 0) lines.push(line("soft_cont", "Soft cost contingency", "contingency", softCont, `${b.softContPct}% of soft costs`));

  const acquisition = sum(lines.filter((l) => l.group === "acquisition").map((l) => l.amount));
  const fees = builderFee + devFee;
  const contingency = hardCont + softCont;
  return { lines, acquisition, hardBase, softBase, fees, contingency, developmentCost: acquisition + hardBase + softBase + fees + contingency };
}

/** Fill percent-of-total and per-sf on a finished set of lines. */
export function withShares(lines: BudgetLine[], sqft: number): BudgetLine[] {
  const total = sum(lines.map((l) => l.amount));
  return lines.map((l) => ({ ...l, pctOfTotal: total > 0 ? (l.amount / total) * 100 : 0, perSf: sqft > 0 ? roundCents(l.amount / sqft) : null }));
}

export interface SourcesUses {
  uses: { label: string; amount: Cents }[];
  sources: { label: string; amount: Cents }[];
  totalUses: Cents;
  totalSources: Cents;
  /** Always 0: the equity source is defined as uses less debt less owner property. */
  difference: Cents;
}

export function sourcesUses(lines: BudgetLine[], loan: Cents, ownerProperty: Cents): SourcesUses {
  const groups: [BudgetGroup, string][] = [["acquisition", "Acquisition"], ["hard", "Hard costs"], ["soft", "Soft costs"], ["fees", "Fees"], ["contingency", "Contingency"], ["financing", "Financing costs"], ["carry", "Carry during development"]];
  const uses = groups.map(([g, label]) => ({ label, amount: sum(lines.filter((l) => l.group === g).map((l) => l.amount)) })).filter((u) => u.amount !== 0);
  const totalUses = sum(uses.map((u) => u.amount));
  const equity = totalUses - loan - ownerProperty;
  const sources = [
    ...(loan > 0 ? [{ label: "Construction loan", amount: loan }] : []),
    ...(ownerProperty > 0 ? [{ label: "Owner equity: existing property", amount: ownerProperty }] : []),
    { label: "Cash equity", amount: equity },
  ];
  const totalSources = sum(sources.map((s) => s.amount));
  return { uses, sources, totalUses, totalSources, difference: totalUses - totalSources };
}
