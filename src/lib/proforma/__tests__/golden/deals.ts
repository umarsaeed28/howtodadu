/**
 * The five reference deals. The same deals are defined in the independent Python reference
 * (docs/proforma-golden/proforma_ref.py); its outputs are the expectations in expected.json.
 */
import { defaultInputs, type ProformaInputs } from "../../schema";

type Patch = (i: ProformaInputs) => void;

const seattleRental: Patch = (i) => {
  i.acquisition.purchasePrice = 775_000_00;
  i.acquisition.closingPct = 1.5;
  i.budget.sqft = 1000;
  i.budget.design = 15_000_00;
  i.budget.engineering = 5_000_00;
  i.budget.survey = 3_000_00;
  i.budget.permitsSdci = 12_000_00;
  i.budget.legal = 2_000_00;
  i.budget.utilities = { sewer: 8_000_00, water: 5_000_00, power: 6_000_00, sideSewer: 4_000_00 };
  i.operations.units = [{ label: "DADU", rent: 3_200_00, otherIncome: 0 }, { label: "House", rent: 4_000_00, otherIncome: 0 }];
  i.operations.propertyTaxAnnual = 9_000_00;
  i.operations.insuranceAnnual = 2_400_00;
  i.operations.capexReserveAnnual = 1_200_00;
  i.operations.repairsPct = 5;
  i.growthExit.exitCapPct = 5.5;
  i.growthExit.rentGrowthPct = 3;
  i.growthExit.expenseGrowthPct = 2;
  i.growthExit.holdYears = 10;
};

export const GOLDEN_DEALS: Record<string, () => ProformaInputs> = {
  rent_hold_all_cash: () => {
    const i = defaultInputs();
    seattleRental(i);
    i.meta.strategy = "rent_hold";
    i.financing.mode = "all_cash";
    return i;
  },
  rent_hold_levered: () => {
    const i = defaultInputs();
    seattleRental(i);
    i.meta.strategy = "rent_hold";
    i.financing.construction.ltcPct = 65;
    return i;
  },
  build_to_sell: () => {
    const i = defaultInputs();
    i.meta.strategy = "sell";
    i.meta.closingDate = "2026-11-15";
    i.acquisition.purchasePrice = 820_000_00;
    i.acquisition.closingPct = 1.0;
    i.acquisition.dueDiligence = 5_000_00;
    i.budget.sqft = 900;
    i.budget.hardPerSf = 360_00;
    i.budget.siteWork = 25_000_00;
    i.budget.design = 20_000_00;
    i.budget.engineering = 6_000_00;
    i.budget.survey = 3_500_00;
    i.budget.permitsSdci = 14_000_00;
    i.budget.legal = 8_000_00;
    i.budget.subdivision = 25_000_00;
    i.budget.builderFeePct = 8;
    i.budget.developerFeePct = 3;
    i.budget.hardContPct = 7;
    i.budget.softContPct = 5;
    i.timeline = { designMo: 2, permitMo: 5, buildMo: 9, leaseUpOrSaleMo: 3, drawCurve: "straight" };
    i.financing.construction = { ltcPct: 70, ratePct: 11, pointsPct: 1.5, interestReserve: false };
    i.operations.propertyTaxAnnual = 9_500_00;
    i.operations.insuranceAnnual = 2_500_00;
    i.growthExit.sale = { scope: "unit", unitPrice: 720_000_00, wholePrice: 0, houseValue: 850_000_00 };
    i.growthExit.sellingPct = 6;
    return i;
  },
  refi_hold: () => {
    const i = defaultInputs();
    i.meta.strategy = "refi_hold";
    i.acquisition.ownership = "owned";
    i.acquisition.currentValue = 900_000_00;
    i.budget.sqft = 1000;
    i.budget.design = 18_000_00;
    i.budget.engineering = 5_000_00;
    i.budget.survey = 3_000_00;
    i.budget.permitsSdci = 13_000_00;
    i.budget.legal = 2_000_00;
    i.budget.utilities = { sewer: 8_000_00, water: 4_000_00, power: 5_000_00, sideSewer: 3_000_00 };
    i.financing.construction.ltcPct = 60;
    i.financing.perm.ltvPct = 70;
    i.financing.perm.minDscr = 1.2;
    i.operations.units = [{ label: "DADU", rent: 3_400_00, otherIncome: 0 }, { label: "House", rent: 4_200_00, otherIncome: 0 }];
    i.operations.vacancyPct = 4;
    i.operations.propertyTaxAnnual = 10_000_00;
    i.operations.insuranceAnnual = 2_600_00;
    i.operations.capexReserveAnnual = 1_000_00;
    i.operations.repairsPct = 4;
    i.growthExit.exitCapPct = 5.0;
    i.growthExit.rentGrowthPct = 2;
    i.growthExit.expenseGrowthPct = 2;
    i.growthExit.holdYears = 7;
    return i;
  },
  lp_gp_waterfall: () => {
    const i = defaultInputs();
    seattleRental(i);
    i.meta.strategy = "rent_hold";
    i.financing.construction.ltcPct = 65;
    i.financing.equity = { lpPct: 90, prefPct: 8, tiers: [{ hurdleIrrPct: 12, lpSharePct: 80 }, { hurdleIrrPct: 18, lpSharePct: 70 }] };
    return i;
  },
};
