/**
 * Sensitivity tables: every cell is a full run of the model with two inputs moved. The base case is the centre.
 */
import type { ProformaInputs } from "./schema";
import { roundCents } from "./money";

export interface SensitivityGrid {
  key: "irr_hard_rent" | "irr_cap_growth" | "profit_price_cost";
  title: string;
  metric: "leveredIrr" | "profit";
  rowLabel: string;
  colLabel: string;
  rows: { label: string; value: number }[];
  cols: { label: string; value: number }[];
  /** [row][col]; IRR as a fraction (null when undefined), profit in cents. */
  cells: (number | null)[][];
  baseRow: number;
  baseCol: number;
}

export type CellRunner = (inputs: ProformaInputs) => { leveredIrr: number | null; profit: number };

const pctLabel = (p: number) => (p === 0 ? "Base" : `${p > 0 ? "+" : ""}${p}%`);
const ptsLabel = (p: number) => (p === 0 ? "Base" : `${p > 0 ? "+" : ""}${p} pt`);

export function sensitivity(i: ProformaInputs, run: CellRunner): SensitivityGrid[] {
  const grids: SensitivityGrid[] = [];
  const hardSteps = [-10, 0, 10, 20], rentSteps = [-10, -5, 0, 5, 10];
  const withHard = (x: ProformaInputs, p: number) => ({ ...x, budget: { ...x.budget, hardPerSf: roundCents(x.budget.hardPerSf * (1 + p / 100)) } });
  const withRent = (x: ProformaInputs, p: number) => ({ ...x, operations: { ...x.operations, units: x.operations.units.map((u) => ({ ...u, rent: roundCents(u.rent * (1 + p / 100)) })) } });
  if (i.meta.strategy !== "sell") {
    grids.push({
      key: "irr_hard_rent", title: "Levered IRR: build cost and rent", metric: "leveredIrr", rowLabel: "Hard cost per sf", colLabel: "Rent",
      rows: hardSteps.map((v) => ({ label: pctLabel(v), value: v })), cols: rentSteps.map((v) => ({ label: pctLabel(v), value: v })),
      cells: hardSteps.map((h) => rentSteps.map((r) => run(withRent(withHard(i, h), r)).leveredIrr)),
      baseRow: hardSteps.indexOf(0), baseCol: rentSteps.indexOf(0),
    });
    const capSteps = [-0.5, -0.25, 0, 0.25, 0.5], growthSteps = [0, 1, 2, 3];
    grids.push({
      key: "irr_cap_growth", title: "Levered IRR: exit cap rate and rent growth", metric: "leveredIrr", rowLabel: "Exit cap rate", colLabel: "Rent growth a year",
      rows: capSteps.map((v) => ({ label: ptsLabel(v), value: v })), cols: growthSteps.map((v) => ({ label: `${v}%`, value: v })),
      cells: capSteps.map((c) => growthSteps.map((g) => run({ ...i, growthExit: { ...i.growthExit, exitCapPct: Math.max(0.5, i.growthExit.exitCapPct + c), rentGrowthPct: g } }).leveredIrr)),
      baseRow: capSteps.indexOf(0), baseCol: growthSteps.indexOf(i.growthExit.rentGrowthPct) >= 0 ? growthSteps.indexOf(i.growthExit.rentGrowthPct) : 0,
    });
  } else {
    const priceSteps = [-10, -5, 0, 5, 10];
    const withPrice = (x: ProformaInputs, p: number) => ({ ...x, growthExit: { ...x.growthExit, sale: { ...x.growthExit.sale, unitPrice: roundCents(x.growthExit.sale.unitPrice * (1 + p / 100)), wholePrice: roundCents(x.growthExit.sale.wholePrice * (1 + p / 100)) } } });
    grids.push({
      key: "profit_price_cost", title: "Profit: sale price and build cost", metric: "profit", rowLabel: "Hard cost per sf", colLabel: "Sale price",
      rows: hardSteps.map((v) => ({ label: pctLabel(v), value: v })), cols: priceSteps.map((v) => ({ label: pctLabel(v), value: v })),
      cells: hardSteps.map((h) => priceSteps.map((p) => run(withPrice(withHard(i, h), p)).profit)),
      baseRow: hardSteps.indexOf(0), baseCol: priceSteps.indexOf(0),
    });
  }
  return grids;
}
