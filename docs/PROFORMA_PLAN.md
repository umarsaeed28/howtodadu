# Pencil proforma: data model, calc engine, export

Plan for the six proforma phases, written after reading the calculator, the FAR engine, the feasibility flow and the
site-plan renderer. Companion to `docs/PLAN.md` (admin, monetization, brand, content evals): the proforma UI waits for
`docs/BRAND.md` from that plan's phase 5, and every default here goes into the same `content/claims.json`.

## 1. The calculator, as found

`/calculator` is live (`src/app/calculator/page.tsx` → `src/components/calculator/CalculatorClient.tsx`). It was never
removed; commit `347e49d` made it a small proforma. It is the free, no-account tool and stays that way.

**Form** (`src/lib/calculator/inputs.ts`, `CalcForm`, URL-serialized with short keys so links stay short):

| Group | Inputs | Default | Source of default |
|---|---|---|---|
| The house | purchase price, closing %, house area, rehab level (none / light $70 / moderate $95 / heavy $120 per sf / custom), house ARV | blank; rehab none | `src/lib/dadu-value.ts` `REHAB_RATES` (team rule, no external source) |
| The DADU | area, build $/sf, soft costs flat, site work, extra permits, contingency % | $350/sf, $50,000 soft | `src/lib/config/costs.ts` `COST_PER_SF` ("mirrors the Supabase `config.cost_per_sf` row"), `dadu-value.ts` `SOFT_COSTS` (team rule) |
| Financing and holding | loan amount or LTC %, rate, permit / build / sale months, tax, insurance, utilities per month | rate 10%, 4 + 8 + 2 months | team rule (`DEFAULT_FORM`) |
| The exit | sale price (auto: house ARV or break-even + DADU resale), selling 6% or typed; rent, cap, vacancy, opex %, refi LTV 70%, rate 6.75%, 30 yr, DSCR 1.25 | 6%; 70 / 6.75 / 30 / 1.25 | team rule; DADU resale from `dadu-value.ts` ($800/sf at 800 sf → $680/sf at 1,000 sf, "team's market read, Oct 2026") |

**Engine** (`src/lib/feasibility/model.ts` `computeFeasibility`, pure, float math, whole-dollar rounding at the end):

- hard = (sf × $/sf + house sf × rehab rate) × (1 + contingency %)
- soft = hard × (arch + eng + PM + insurance %) + permits + survey + legal + flat
- loan = fixed amount, else LTC % × (acquisition + hard + soft)
- interest = loan × rate × build months / 12 × **0.6** (average draw) + acquisition × LTC × rate × permit months / 12 + loan × rate × exit months / 12
- carrying = (tax + insurance + utilities) × (permit + build + exit months)
- sell: profit = gross × (1 − selling %) − total; margin on cost; ROE; equity multiple; "annualized" = multiple^(12/months) − 1 (not an IRR)
- hold: NOI = rent × 12 × (1 − vacancy) × (1 − opex 30%); value = NOI / cap; perm loan = min(LTV × value, NOI / DSCR / mortgage constant); refi cash-out; cash-on-cash
- sensitivity grid: margin for hard ±, value ± (`src/lib/feasibility/analysis.ts`); `maxOffer` bisects price to a 15% margin

Golden tests: `src/lib/feasibility/__tests__/model.test.ts`, `analysis.test.ts`, `src/lib/calculator/__tests__/inputs.test.ts`.
These stay untouched; the calculator keeps this engine. Entry points into it: `calculatorHref()` from the report
(`FeasibilityReportView.tsx` "Estimate your return", with the drawn DADU's sf, listing price and house sf) and the
master plan; the map and listing pages.

**What it lacks for an underwriter:** monthly periodicity, a real draw schedule, XIRR, Sources & Uses that balance,
REET, SDCI fees, a permanent-loan schedule, a hold-period proforma with growth, LP/GP waterfall, tax, exports.
That is the new engine's job; the calculator is not rewritten.

## 2. What the proforma consumes, never recomputes

| From | Field | Via |
|---|---|---|
| FAR engine (`src/lib/feasibility/far.ts`) | allowed floor area, FAR | `maxFloorAreaForZone(zone, lot, units)` |
| ADU analysis (`src/lib/adu-analysis.ts`) | max DADU sf, footprint, stories, coverage left | `generateADUReport().daduFootprint` |
| Study (`src/lib/report/study.ts`) | zone name, lot, setbacks, height | `buildStudy()` rows |
| Master plan (`MasterPlan.tsx`) | the drawn DADU (sf, w × d, stories) and the plan SVG | `PlanSnapshot` (already used by the PDF) and `saved-plan.ts` per parcel |
| Listing / parcel | price, house sf, assessed values | `FeasibilityResult.listing`, `parcel.landValue/improvementValue` |

Prefill from a feasibility result: address, PIN, lot sf, zone, DADU sf (drawn or max), unit count = house + DADU
(the FAR density that `study.ts` already uses), purchase price when listed. Nothing in `src/lib/proforma/` imports
the engine's internals; it takes a `ProformaPrefill` object the report page builds.

## 3. Data model

`src/lib/proforma/schema.ts` (zod, the one definition for UI, DB and export):

```
ProformaInputs {
  version: "1"                       // engine version the inputs were written for
  meta: { title, address, pin, strategy: "rent_hold" | "sell" | "refi_hold", scenario: "base" | "downside" | "upside" }
  acquisition: { ownership: "buy" | "owned", purchasePrice | currentValue, closingPct, reetMode: "wa_graduated" | "manual", reetManual, dueDiligence }
  budget: { sqft, sqftSource: "far_engine" | "drawn" | "manual", hardPerSf, siteWork, utilities: { sewer, water, power, sideSewer },
            design, engineering, survey, permitsSdci, legal, subdivision, builderFeePct, developerFeePct, hardContPct, softContPct }
  timeline: { designMo, permitMo, buildMo, leaseUpOrSaleMo, drawCurve: "scurve" | "straight" }
  financing: { mode: "all_cash" | "construction" | "construction_then_perm",
               construction: { ltcPct, ratePct, pointsPct, interestReserve: bool },
               perm: { ltvPct, ratePct, amortYears, minDscr, cashOut: bool },
               equity: { lpPct, gpPct, prefPct, promoteTiers: [{ hurdleIrrPct, lpSharePct }] } | null }
  operations: { units: [{ rent, otherIncome }], vacancyPct, propertyTaxMode: "king_county" | "manual", propertyTaxAnnual,
                insurance, utilities, repairsPct, capexReserve, mgmtPct, hoa }
  growthExit: { rentGrowthPct, expenseGrowthPct, holdYears, exitCapPct, sellingPct, salePricePerUnit }
  tax: { enabled, landSharePct, depreciationYears: 27.5, marginalRatePct } 
}
ProformaOutputs { sourcesUses, budget[], monthly[], annual[], metrics, waterfall | null, sensitivity, flags[], engineVersion, generatedAt }
```

Money is **integer cents** everywhere in inputs and outputs (`number`, safe to $90 trillion); percentages are
numbers in percent. No decimal library: cents plus explicit rounding at every period boundary is simpler to audit than
a decimal type, and the Excel reconciliation (§5) catches drift. Rates that must be floats (IRR, NPV) are computed
on the cent flows and returned as numbers.

**DB** (migration after the admin plan's `0011`; `0012_proformas.sql` with a `down/` file):

```
proformas         id, owner_id (null for guests until claimed), share_token, title, address, pin, strategy,
                  engine_version, inputs jsonb, created_at, updated_at, deleted_at
proforma_exports  id, proforma_id, kind (xlsx|pdf|link), user_id, created_at      -- admin metrics
```
Saved rows keep `engine_version`; `src/lib/proforma/versions/` keeps each released engine so an old proforma recomputes
with the engine it was saved under and an old export stays reproducible. Guests save to `localStorage` (like
`saved-plan.ts`); an account claims them (like `/api/orders/claim`).

## 4. Calc engine (`src/lib/proforma/`, pure TypeScript, no UI imports)

```
schema.ts        zod types, defaults loader (reads content/claims.json entries by id)
money.ts         cents helpers, banker's rounding, pct
finance.ts       xirr (Newton with bisection fallback), npv, pmt/amortization schedule, dscr
draws.ts         draw schedule: straight-line or S-curve (cumulative normal over the build months)
reet.ts          WA graduated REET on the purchase price            {{TODO: source needed}} until the claim is entered
budget.ts        development budget lines, % of total, $/sf; sources & uses
loans.ts         construction loan: draws, interest-only on drawn balance, points, interest reserve capitalized;
                 permanent loan sized to min(LTV, DSCR); cash-out refi
operations.ts    monthly rent roll, vacancy, opex lines, NOI; annual rollups from monthly
strategies.ts    rent_hold | sell | refi_hold cash-flow assembly on one monthly timeline
waterfall.ts     LP/GP: return of capital, preferred return, promote tiers by IRR hurdle
metrics.ts       total cost, all-in $/sf, yield on cost, spread to exit cap, unlevered and levered IRR, equity multiple,
                 cash-on-cash (yr 1, avg), DSCR by year, break-even occupancy, peak equity, months to stabilization,
                 profit on cost, cash left in deal
sensitivity.ts   the three grids, each cell a full run
flags.ts         deterministic risk flags (DSCR < min, negative leverage, contingency < 5%, permit months < typical
                 SDCI time {{TODO: source needed}}, YoC < exit cap)
scenarios.ts     base / downside / upside presets as input deltas
index.ts         compute(inputs): ProformaOutputs
```

Monthly periodicity throughout; annual tables are sums of months. Month 0 is closing; design, permit, build,
lease-up run in sequence; the hold period starts at stabilization. Construction interest accrues on the drawn balance
each month and, with the reserve on, is drawn from the loan itself (a Use funded by the loan, so Sources = Uses to
the cent). Property tax from King County's effective rate `{{TODO: source needed}}` (the `0.92%` in
`src/lib/feasibility/defaults.ts` has no citation and is not reused).

**Tests** (`src/lib/proforma/__tests__/`):
- unit: `finance.test.ts` against known Excel results (XIRR, PMT, NPV on published examples), draw curve sums to the
  budget, REET brackets, waterfall tiers;
- golden: `golden/*.json`, five reference deals (rent-hold all cash, rent-hold levered, build-to-sell, cash-out refi,
  LP/GP waterfall) with expected outputs hand-verified in Excel, tolerance ±$1 cash, ±0.01% rates. The Excel files
  that produced them live in `docs/proforma-golden/` so a reviewer can open them;
- property (`fast-check` is not installed; a seeded loop over random inputs is enough): Sources = Uses; sum of
  monthly net cash flows = total profit; changing any `operations` or `growthExit` input leaves `budget[]` unchanged;
  no NaN/Infinity;
- performance: `compute()` on a 10-year model under 50 ms in a test (expected ~2 ms; a Web Worker only if measured over).

## 5. Export

**Excel with live formulas:** `exceljs` (new dependency, see §7). Tabs: Summary, Assumptions, Sources & Uses,
Development Budget, Monthly Cash Flow, Annual Proforma, Debt, Waterfall, Sensitivity, Notes & Sources. Inputs in blue,
formulas in black, named ranges for every assumption, frozen headers, print areas and landscape setup. The sheet
formulas mirror `src/lib/proforma/` line for line; each engine function has a sibling that emits its Excel formula so
the two cannot drift silently.

**Reconciliation in CI:** `scripts/reconcile-proforma.ts` builds the workbook for each golden deal, recalculates it
with HyperFormula (devDependency), and asserts every Summary cell equals the TypeScript output within tolerance.
Runs in `npm run build` and the CI workflow; a divergence fails the build. XIRR is not in HyperFormula's function
set, so the Debt and Summary IRR cells use a Newton iteration written as formulas (12 steps, converges on these
flows) and the reconciliation checks it against the engine.

**PDF:** `jspdf` is already used by the report PDF (`src/lib/report-pdf/build-report-pdf.ts`); the proforma PDF
reuses that builder's page frame and `rasterize-svg.ts` for the site plan. 2–4 pages: property and plan; Sources &
Uses and key metrics; budget and annual proforma; sensitivity, assumptions with sources, disclaimers.

**Share link:** `/proforma/[id]?t=<share_token>`, read-only render of the saved inputs through the saved engine
version.

Every export carries the generation date, the assumption sources (from the claims registry), `engineVersion`, the
disclaimer "Estimates for planning purposes only. Not a guarantee of permit outcomes, costs, or returns. Not
financial, tax, or legal advice." and the brokerage name `{{TODO: licensed brokerage name}}` (WAC 308-124B-210).

**Gating:** viewing is free. Export and share need a free account (existing Supabase signup with email capture).
No payment gate.

## 6. UI (`/proforma`, `/proforma/[id]`)

Built in phase 3 on `docs/BRAND.md` with the `/impeccable` and `/frontend-design` skills and `pencil-design`.
Inputs left (top on mobile), results right, live recompute on every change. Hero strip: all-in cost, yield on cost,
levered IRR, equity multiple, animated on change (`prefers-reduced-motion` respected). Charts as inline SVG with a
`<table>` fallback: cumulative cash-flow J-curve, budget breakdown, NOI over the hold. The site-plan SVG from the
feasibility flow beside the numbers when the proforma came from a report. Strategy tabs with side-by-side compare.
Scenario toggle. Sensitivity heatmaps (the existing `Heatmap.tsx` pattern, re-skinned). Risk flags as a list.
Newsletter prompt after the first full compute, never before. Short-term rental appears only if
`content/claims.json` carries a Seattle STR rule with an SMC/SDCI citation; until then it is hidden.

Calculator (phase 1): re-skinned to the brand, same engine and tests, plus "Open full proforma" that maps `CalcForm`
→ `ProformaInputs` (`src/lib/proforma/from-calculator.ts`, tested both ways).

## 7. New dependencies

| Package | Why | Alternative rejected |
|---|---|---|
| `exceljs` | writes `.xlsx` with formulas, named ranges, styles, freeze panes, print setup; maintained, MIT | `xlsx` (SheetJS) community build lags and styling needs the paid build |
| `hyperformula` (dev only) | headless recalculation of the exported workbook in CI | LibreOffice headless: 400 MB in CI, slower; kept as the fallback if HyperFormula's GPL-3 dev-only use is not acceptable (see Q3) |
| `@playwright/test` (dev) | shared with `docs/PLAN.md`; E2E calculator → proforma → exports | — |
| nothing for money, charts, PDF, state | integer cents; inline SVG; `jspdf` installed; React state + URL, `zustand` installed if needed | `decimal.js`, `recharts`, `@react-pdf/renderer` |

## 8. Claims this plan needs (go into `content/claims.json`)

| Claim | Status |
|---|---|
| Construction $350/sf | Pencil estimate, Oct 2026 (`costs.ts`) — label "Pencil estimate, as of {date}", editable |
| Soft costs $50,000 | Pencil estimate (`dadu-value.ts`) |
| DADU resale $/sf curve | Pencil market read, Oct 2026 (`dadu-value.ts`) |
| WA REET graduated rates | `{{TODO: source needed}}` WA Dept of Revenue, URL and date checked |
| King County effective property tax rate | `{{TODO: source needed}}` King County Assessor |
| Typical SDCI permit time for a DADU | `{{TODO: source needed}}` SDCI |
| SDCI permit fees | `{{TODO: source needed}}` SDCI fee subtitle |
| Residential depreciation 27.5 years, land excluded | IRS Publication 946 |
| Seattle short-term rental rules | `{{TODO: source needed}}` SMC 6.600 / SDCI; option hidden until entered |
| Unit lot subdivision | SDCI's Jan 2026 NR summary: "An accessory dwelling unit may not be separated from the principal unit through subdivision." See Q2 |

## 9. Phases

1. Discovery + calculator — this file; calculator re-skin waits for BRAND.md, so phase 1 ends with the plan and the
   `CalcForm` → `ProformaInputs` mapping stub. Checkpoint.
2. Calc engine, golden tests, reconciliation harness (engine + HyperFormula harness only; the workbook writer comes in 4).
3. Proforma UI.
4. Excel export + reconciliation in CI.
5. PDF export + share links + `proformas` migration.
6. Guardrails, content evals on `/proforma`, admin metrics, final QA.

## 10. Open questions

**Q1. Order against `docs/PLAN.md`.** The engine (phase 2) needs nothing from the other plan and can start now.
The UI (phase 3) wants `BRAND.md`; the defaults want `claims.json`. I propose: proforma phase 2 next, then the other
plan's phases 2–5, then proforma 3–6. Say if you want the proforma UI before the admin work.

**Q2. "Sell the DADU separately via unit lot subdivision."** Under the January 2026 NR rules an ADU cannot be split
off by subdivision. A separately saleable second unit has to be a second *principal* dwelling (allowed by the new
density rules), which changes setbacks (15 ft rear → the principal-unit value) and the FAR density used. The
build-to-sell strategy will label this "second principal unit on its own unit lot" and `{{TODO}}` the subdivision
cost until sourced. Confirm this is the product you mean.

**Q3. HyperFormula license.** GPL-3 (or commercial). Used only in CI to recalculate test workbooks, nothing shipped.
If that is not acceptable, the reconciliation runs LibreOffice headless in CI instead (slower, no license question).

**Q4. Brokerage name** for the disclaimer (same as the other plan's Q4).

**Q5. Calculator engine.** The calculator keeps `src/lib/feasibility/model.ts` untouched. Later, once the proforma
engine's golden tests are green, the calculator could become a thin view over it (one engine, two UIs). Not in this
plan unless you want it.
