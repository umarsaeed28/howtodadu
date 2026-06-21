import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRuleset, evaluateScenario } from "../src/far.js";
import type { Scenario, Structure } from "../src/types.js";
import { renderSitePlan } from "../src/siteplan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULESET_PATH = join(__dirname, "..", "rulesets", "seattle-nr-2026-01.json");
const OUT_DIR = join(__dirname, "..", "out");

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

const scenarios: Scenario[] = [
  {
    id: "s1",
    label: "1 unit keep house",
    grossLotAreaSf: LOT,
    units: 1,
    structures: [house],
  },
  {
    id: "s2",
    label: "2 units house + DADU",
    grossLotAreaSf: LOT,
    units: 2,
    structures: [house, unit("DADU", 1000)],
  },
  {
    id: "s3",
    label: "3 units + AADU + DADU",
    grossLotAreaSf: LOT,
    units: 3,
    structures: [house, unit("AADU", 500), unit("DADU", 1000)],
  },
  {
    id: "s4",
    label: "4 units redevelop",
    grossLotAreaSf: LOT,
    units: 4,
    structures: [unit("TH1", 1400), unit("TH2", 1400), unit("TH3", 1400), unit("TH4", 1400)],
  },
];

const ruleset = loadRuleset(RULESET_PATH);

console.log("Scenario FAR table");
console.log("scenario | density | FAR | budget | used | left | fits");
console.log("---|---|---|---|---|---|---");

for (const s of scenarios) {
  const r = evaluateScenario(s, ruleset);
  console.log(
    `${r.label} | ${r.densitySfPerUnit} | ${r.tierFar} | ${r.budgetSf} | ${r.consumedSf} | ${r.remainingSf} | ${r.fits}`
  );
}

const twoUnit = evaluateScenario(scenarios[1], ruleset);
console.log("\n2-unit unverifiedConstants:");
for (const f of twoUnit.unverifiedConstants) {
  console.log(`  ${f.key}: ${f.value} (${f.source})`);
}

const svg = renderSitePlan({
  lot: { widthFt: 40, depthFt: 98 },
  setbacks: { frontFt: 15, rearFt: 0, sideFt: 5 },
  structures: [
    {
      id: "house",
      label: "House",
      kind: "existing",
      xFt: 8,
      yFt: 15,
      wFt: 24,
      dFt: 36,
      sublabel: "1400 sf · schematic placement",
    },
    {
      id: "dadu",
      label: "DADU",
      kind: "proposed",
      xFt: 8,
      yFt: 74,
      wFt: 24,
      dFt: 24,
      sublabel: "1000 sf · schematic fit study",
    },
  ],
  geometrySource: "Rectangular lot 40×98 ft · setbacks front 15 / side 5 / rear 0 (alley)",
  caption: "Illustrative · assumed dimensions · not survey data",
});

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, "site-plan-house-dadu.svg");
writeFileSync(outPath, svg, "utf8");
console.log(`\nWrote ${outPath}`);
