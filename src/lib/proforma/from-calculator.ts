/**
 * "Open full proforma" from the calculator: the calculator's form (src/lib/calculator/inputs.ts) mapped onto
 * ProformaInputs, so every number the visitor typed carries over. Blank calculator fields keep the proforma's
 * defaults. The reverse mapping serves the proforma's "Back to the calculator" link.
 */
import { DEFAULT_FORM, parseNumber, type CalcForm } from "@/lib/calculator/inputs";
import { REHAB_RATES } from "@/lib/dadu-value";
import { defaultInputs, type ProformaInputs } from "./schema";
import { dollars, roundCents } from "./money";

const num = (s: string): number | null => {
  const n = parseNumber(s);
  return n == null || Number.isNaN(n) ? null : n;
};

export function fromCalculator(form: CalcForm, address = ""): ProformaInputs {
  const i = defaultInputs();
  i.meta.address = address;
  const price = num(form.price);
  const rent = num(form.rent);
  i.meta.strategy = rent != null && rent > 0 && !(num(form.salePrice) ?? 0) ? "rent_hold" : "sell";
  if (price != null && price > 0) {
    i.acquisition.ownership = "buy";
    i.acquisition.purchasePrice = dollars(price);
  } else {
    i.acquisition.ownership = "owned";
    i.acquisition.currentValue = dollars(num(form.houseArv) ?? 0);
  }
  i.acquisition.closingPct = num(form.closingPct) ?? 0;
  const sf = num(form.sf);
  if (sf != null && sf > 0) i.budget.sqft = sf;
  const cost = num(form.costPerSf);
  if (cost != null && cost > 0) i.budget.hardPerSf = dollars(cost);
  i.budget.siteWork = dollars(num(form.siteWork) ?? 0);
  // The calculator's one soft-cost number becomes design; its extra permits become SDCI permits.
  i.budget.design = dollars(num(form.softFlat) ?? 0);
  i.budget.permitsSdci = dollars(num(form.permits) ?? 0);
  i.budget.hardContPct = num(form.contingencyPct) ?? i.budget.hardContPct;
  // Rehab of the house rides along as site work (the proforma has no rehab line).
  const houseSqft = num(form.houseSqft) ?? 0;
  const rehabRate = form.rehabLevel === "custom" ? num(form.rehabPerSf) ?? 0 : REHAB_RATES[form.rehabLevel] ?? 0;
  if (houseSqft > 0 && rehabRate > 0) i.budget.siteWork += dollars(houseSqft * rehabRate);
  i.timeline.permitMo = num(form.permitMonths) ?? i.timeline.permitMo;
  i.timeline.buildMo = Math.max(1, num(form.buildMonths) ?? i.timeline.buildMo);
  i.timeline.leaseUpOrSaleMo = num(form.exitMonths) ?? i.timeline.leaseUpOrSaleMo;
  i.timeline.designMo = 0;
  const ltc = num(form.ltcPct);
  const loan = num(form.loanAmount);
  if ((ltc != null && ltc > 0) || (loan != null && loan > 0)) {
    i.financing.mode = "construction_loan";
    i.financing.construction.ltcPct = ltc != null && ltc > 0 ? ltc : 50;
  } else i.financing.mode = "all_cash";
  i.financing.construction.ratePct = num(form.ratePct) ?? i.financing.construction.ratePct;
  i.financing.construction.pointsPct = 0;
  i.financing.perm.ltvPct = num(form.permLtvPct) ?? i.financing.perm.ltvPct;
  i.financing.perm.ratePct = num(form.permRatePct) ?? i.financing.perm.ratePct;
  i.financing.perm.amortYears = num(form.permYears) ?? i.financing.perm.amortYears;
  i.financing.perm.minDscr = num(form.minDscr) ?? i.financing.perm.minDscr;
  i.operations.propertyTaxAnnual = dollars((num(form.taxMonthly) ?? 0) * 12);
  i.operations.insuranceAnnual = dollars((num(form.insuranceMonthly) ?? 0) * 12);
  i.operations.utilitiesAnnual = dollars((num(form.utilitiesMonthly) ?? 0) * 12);
  i.operations.vacancyPct = num(form.vacancyPct) ?? i.operations.vacancyPct;
  const opex = num(form.opexPct);
  if (opex != null) { i.operations.repairsPct = Math.max(0, opex - i.operations.mgmtPct); }
  if (rent != null && rent > 0) i.operations.units = [{ label: "DADU", rent: dollars(rent), otherIncome: 0 }];
  i.growthExit.exitCapPct = num(form.capPct) ?? 0;
  i.growthExit.sellingPct = form.sellSix === "1" ? 6 : num(form.sellingPct) ?? 0;
  const sale = num(form.salePrice);
  if (sale != null && sale > 0) i.growthExit.sale = { scope: "whole", unitPrice: 0, wholePrice: dollars(sale), houseValue: 0 };
  return i;
}

/** The proforma's inputs back into a calculator form, for the link back. Only fields both sides have. */
export function toCalculator(i: ProformaInputs): CalcForm {
  const f: CalcForm = { ...DEFAULT_FORM };
  const d = (c: number) => (c > 0 ? String(roundCents(c / 100)) : "");
  f.price = i.acquisition.ownership === "buy" ? d(i.acquisition.purchasePrice) : "";
  f.closingPct = i.acquisition.closingPct ? String(i.acquisition.closingPct) : "";
  f.sf = i.budget.sqft ? String(i.budget.sqft) : "";
  f.costPerSf = String(roundCents(i.budget.hardPerSf / 100));
  f.siteWork = d(i.budget.siteWork);
  f.softFlat = d(i.budget.design);
  f.permits = d(i.budget.permitsSdci);
  f.contingencyPct = i.budget.hardContPct ? String(i.budget.hardContPct) : "";
  f.permitMonths = String(i.timeline.permitMo);
  f.buildMonths = String(i.timeline.buildMo);
  f.exitMonths = String(i.timeline.leaseUpOrSaleMo);
  f.ltcPct = i.financing.mode === "construction_loan" && i.financing.construction.ltcPct ? String(i.financing.construction.ltcPct) : "";
  f.ratePct = String(i.financing.construction.ratePct);
  f.taxMonthly = d(roundCents(i.operations.propertyTaxAnnual / 12));
  f.insuranceMonthly = d(roundCents(i.operations.insuranceAnnual / 12));
  f.utilitiesMonthly = d(roundCents(i.operations.utilitiesAnnual / 12));
  f.rent = d(i.operations.units.reduce((s, u) => s + u.rent, 0));
  f.capPct = i.growthExit.exitCapPct ? String(i.growthExit.exitCapPct) : "";
  f.vacancyPct = String(i.operations.vacancyPct);
  f.permLtvPct = String(i.financing.perm.ltvPct);
  f.permRatePct = String(i.financing.perm.ratePct);
  f.permYears = String(i.financing.perm.amortYears);
  f.minDscr = String(i.financing.perm.minDscr);
  if (i.growthExit.sellingPct === 6) f.sellSix = "1"; else { f.sellSix = "0"; f.sellingPct = String(i.growthExit.sellingPct); }
  if (i.meta.strategy === "sell") f.salePrice = d(i.growthExit.sale.scope === "whole" ? i.growthExit.sale.wholePrice : i.growthExit.sale.unitPrice);
  return f;
}
