# Pencil FAR module (Seattle NR)

Versioned, deterministic Seattle Neighborhood Residential (NR) floor-area-ratio engine with an honest chargeable-area model, rectangular buildable-envelope geometry, and SVG site-plan rendering.

Used for investor-facing feasibility. **Accuracy and provenance are the product.**

## Run

```bash
npx tsx --test tests/far.golden.test.ts
npx tsx tests/demo.ts
```

`demo.ts` prints the four golden scenarios and writes `out/site-plan-house-dadu.svg`.

## Invariants

1. **FAR is per scenario** — density (net lot area ÷ units) selects the tier.
2. **Chargeable ≠ gross** — below-grade is never added; Type A and common-wall deductions apply.
3. **Budget = max(tier FAR × net lot, minimum floor)**.
4. **Net lot = gross − ECA** before density/FAR math.
5. **ADUs count** toward units and consumed area.
6. **No silent pass** — overruns return `fits: false` with negative `remainingSf`.
7. **Flag, don't guess** — unverified ruleset constants are returned in `unverifiedConstants`.
8. **Deterministic** — pure functions; same input → identical JSON output.
9. **Geometry honesty** — rectangles are exact; `renderFromGisPolygon()` throws until a real inward-offset engine is wired.

## Layout

```
rulesets/seattle-nr-2026-01.json   Versioned constants + citations
src/types.ts                       Shared types
src/far.ts                         FAR engine
src/siteplan.ts                    Envelope + SVG site plan
tests/far.golden.test.ts           Golden-file contract (node:test)
tests/demo.ts                      Table + sample SVG
```

## Before production

Every ruleset constant in `seattle-nr-2026-01.json` is currently `verified: false`. Confirm tier table, minimum floor, bonuses, and exemptions against the live text of **SMC 23.44.011** / **23.42.022**, then flip `verified: true` and bump `version`.

The **logic** in this module is settled; the **constants** are what to verify.

Wire a King County parcel-polygon fetch plus a turf/clipper inward offset into the geometry path so envelopes and site plans run on the legal boundary, not an assumed rectangle. Keep `renderFromGisPolygon` throwing until that is real.
