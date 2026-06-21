import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  loadRuleset,
  selectTier,
  chargeableArea,
  evaluateScenario,
  farBudget,
} from "../src/far.js";
import type { Ruleset, Scenario, Structure } from "../src/types.js";
import {
  buildableEnvelope,
  structureFitsEnvelope,
  renderFromGisPolygon,
} from "../src/siteplan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULESET_PATH = join(__dirname, "..", "rulesets", "seattle-nr-2026-01.json");

const LOT = 3920;

const house: Structure = {
  id: "house",
  label: "Existing house",
  kind: "existing",
  aboveGradeSf: 1400,
  belowGradeSf: 700,
};

function unit(id: string, sf: number): Structure {
  return { id, label: id, kind: "proposed", aboveGradeSf: sf };
}

function tierFar(density: number, ruleset: Ruleset): number {
  return selectTier(density, ruleset).far;
}

describe("FAR golden contract", () => {
  const ruleset = loadRuleset(RULESET_PATH);

  it("tier lookup by density", () => {
    assert.equal(tierFar(5000, ruleset), 0.6);
    assert.equal(tierFar(4000, ruleset), 0.6);
    assert.equal(tierFar(3920, ruleset), 0.8);
    assert.equal(tierFar(2200, ruleset), 1.0);
    assert.equal(tierFar(1960, ruleset), 1.0);
    assert.equal(tierFar(1600, ruleset), 1.6);
    assert.equal(tierFar(980, ruleset), 1.6);
  });

  it("scenario 1: 1 unit keep house", () => {
    const s: Scenario = {
      id: "s1",
      label: "1 unit keep house",
      grossLotAreaSf: LOT,
      units: 1,
      structures: [house],
    };
    const r = evaluateScenario(s, ruleset);
    assert.equal(r.densitySfPerUnit, 3920);
    assert.equal(r.tierFar, 0.8);
    assert.equal(r.budgetSf, 3136);
    assert.equal(r.consumedSf, 1400);
    assert.equal(r.remainingSf, 1736);
    assert.equal(r.fits, true);
  });

  it("scenario 2: 2 units house + DADU", () => {
    const s: Scenario = {
      id: "s2",
      label: "2 units house + DADU",
      grossLotAreaSf: LOT,
      units: 2,
      structures: [house, unit("DADU", 1000)],
    };
    const r = evaluateScenario(s, ruleset);
    assert.equal(r.densitySfPerUnit, 1960);
    assert.equal(r.tierFar, 1.0);
    assert.equal(r.budgetSf, 3920);
    assert.equal(r.consumedSf, 2400);
    assert.equal(r.remainingSf, 1520);
    assert.equal(r.fits, true);
  });

  it("scenario 3: 3 units + AADU + DADU", () => {
    const s: Scenario = {
      id: "s3",
      label: "3 units + AADU + DADU",
      grossLotAreaSf: LOT,
      units: 3,
      structures: [house, unit("AADU", 500), unit("DADU", 1000)],
    };
    const r = evaluateScenario(s, ruleset);
    assert.equal(r.densitySfPerUnit, 1306.67);
    assert.equal(r.tierFar, 1.6);
    assert.equal(r.budgetSf, 6272);
    assert.equal(r.consumedSf, 2900);
    assert.equal(r.remainingSf, 3372);
    assert.equal(r.fits, true);
  });

  it("scenario 4: 4 units redevelop", () => {
    const s: Scenario = {
      id: "s4",
      label: "4 units redevelop",
      grossLotAreaSf: LOT,
      units: 4,
      structures: [
        unit("TH1", 1400),
        unit("TH2", 1400),
        unit("TH3", 1400),
        unit("TH4", 1400),
      ],
    };
    const r = evaluateScenario(s, ruleset);
    assert.equal(r.densitySfPerUnit, 980);
    assert.equal(r.tierFar, 1.6);
    assert.equal(r.budgetSf, 6272);
    assert.equal(r.consumedSf, 5600);
    assert.equal(r.remainingSf, 672);
    assert.equal(r.fits, true);
  });

  it("edge: 4×1700 sf overruns budget", () => {
    const s: Scenario = {
      id: "over",
      label: "4 units oversized",
      grossLotAreaSf: LOT,
      units: 4,
      structures: [unit("U1", 1700), unit("U2", 1700), unit("U3", 1700), unit("U4", 1700)],
    };
    const r = evaluateScenario(s, ruleset);
    assert.equal(r.consumedSf, 6800);
    assert.equal(r.fits, false);
    assert.ok(r.remainingSf < 0);
  });

  it("edge: chargeable exemptions", () => {
    const st: Structure = {
      id: "mix",
      label: "Mixed",
      kind: "existing",
      aboveGradeSf: 2000,
      belowGradeSf: 800,
      accessibleTypeASf: 300,
      commonWallDeductionSf: 100,
    };
    const { total } = chargeableArea([st], ruleset);
    assert.equal(total, 1600);
  });

  it("edge: greater-of minimum floor", () => {
    const s: Scenario = {
      id: "minfloor",
      label: "Min floor wins",
      grossLotAreaSf: 3000,
      units: 1,
      structures: [unit("U1", 100)],
    };
    const r = evaluateScenario(s, ruleset);
    assert.equal(r.rawBudgetSf, 2400);
    assert.equal(r.budgetSf, 2500);
  });

  it("edge: ECA reduces net lot area", () => {
    const b = farBudget({ netLotAreaSf: 3000, units: 2, ruleset });
    assert.equal(b.densitySfPerUnit, 1500);
    assert.equal(b.tierFar, 1.6);

    const s: Scenario = {
      id: "eca",
      label: "ECA",
      grossLotAreaSf: 4000,
      ecaAreaSf: 1000,
      units: 2,
      structures: [house],
    };
    const r = evaluateScenario(s, ruleset);
    assert.equal(r.netLotAreaSf, 3000);
    assert.equal(r.densitySfPerUnit, 1500);
    assert.equal(r.tierFar, 1.6);
  });

  it("determinism: same input yields byte-identical output", () => {
    const s: Scenario = {
      id: "s2",
      label: "2 units house + DADU",
      grossLotAreaSf: LOT,
      units: 2,
      structures: [house, unit("DADU", 1000)],
    };
    const a = evaluateScenario(s, ruleset);
    const b = evaluateScenario(s, ruleset);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  it("flags: 2-unit scenario collects unverified constants", () => {
    const s: Scenario = {
      id: "s2",
      label: "2 units house + DADU",
      grossLotAreaSf: LOT,
      units: 2,
      structures: [house, unit("DADU", 1000)],
    };
    const r = evaluateScenario(s, ruleset);
    const keys = r.unverifiedConstants.map((f) => f.key);
    assert.ok(keys.includes("tier.far-1.0"));
    assert.ok(keys.includes("minFloorAreaSf"));
    assert.ok(keys.includes("exempt.below-grade"));
    for (const f of r.unverifiedConstants) {
      assert.equal(f.verified, false);
      assert.ok(f.source.length > 0);
    }
  });

  it("geometry: buildable envelope", () => {
    const env = buildableEnvelope({ widthFt: 40, depthFt: 98 }, { frontFt: 15, rearFt: 0, sideFt: 5 });
    assert.equal(env.wFt, 30);
    assert.equal(env.dFt, 83);
    assert.equal(env.areaSf, 2490);
  });

  it("geometry: structure fit checks", () => {
    const env = buildableEnvelope({ widthFt: 40, depthFt: 98 }, { frontFt: 15, rearFt: 0, sideFt: 5 });
    assert.equal(
      structureFitsEnvelope({ xFt: 8, yFt: 74, wFt: 24, dFt: 24 }, env),
      true
    );
    assert.equal(
      structureFitsEnvelope({ xFt: 8, yFt: 5, wFt: 24, dFt: 24 }, env),
      false
    );
  });

  it("geometry: renderFromGisPolygon throws", () => {
    assert.throws(() => renderFromGisPolygon(), /inward-offset|Refusing to fabricate/);
  });
});
