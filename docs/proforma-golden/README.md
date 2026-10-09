# Proforma golden reference

`proforma_ref.py` is an independent implementation of the proforma spec (docs/PROFORMA_PLAN.md) in Python: its own
rounding (Decimal, half-up), its own S-curve (math.erf), its own bisection IRR, numpy-financial-style PMT. It defines
the five reference deals that `src/lib/proforma/__tests__/golden/deals.ts` defines in TypeScript, and its output is
frozen in `src/lib/proforma/__tests__/golden/expected.json`. The engine must match it to ±$1 on cash and ±0.01% on
rates (`golden.test.ts`).

Regenerate after a deliberate spec change (and change both implementations):

```bash
python3 docs/proforma-golden/proforma_ref.py > src/lib/proforma/__tests__/golden/expected.json
```

No Excel was used to produce these numbers; the Excel export is reconciled separately against the engine in CI
(phase 4, `scripts/reconcile-proforma.ts`).
