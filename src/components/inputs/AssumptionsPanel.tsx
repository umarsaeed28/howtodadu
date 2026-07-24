"use client";

import { useEffect } from "react";
import type { DealInputs, ExitStrategy } from "@/lib/feasibility/model";
import { computeFeasibility } from "@/lib/feasibility/model";
import { verdictFromMargin } from "@/lib/parcels";
import {
  useDealStore,
  useDealInputs,
  useDealDefaults,
  type DealGroup,
} from "@/lib/deal-store";
import { usd, pct } from "@/lib/format";
import { suggestComps } from "@/lib/feasibility/comps";
import { computeFar, maxFarForZone } from "@/lib/feasibility/far";
import VerdictPill from "@/components/pencil-app/VerdictPill";
import AssumptionGroup from "./AssumptionGroup";
import AssumptionField from "./AssumptionField";

const STRATEGY_LABELS: Record<ExitStrategy, string> = {
  sell_permit_ready: "Sell permit ready",
  sell_finished: "Sell finished",
  hold_rent: "Hold & rent",
};

/**
 * Reusable assumptions workspace. Renders one collapsible group per cost
 * category, wired to the shared deal store, with a live result strip. Used
 * identically on the parcel detail page and in the feasibility tool.
 */
export default function AssumptionsPanel({
  dealId,
  initialInputs,
  showResult = true,
  neighborhood,
  lotSqft,
  zoning,
}: {
  dealId: string;
  initialInputs: DealInputs;
  /** Show the live verdict/result strip. Off on the detail page where VerdictBlock already shows it. */
  showResult?: boolean;
  /** Submarket used to suggest resale value from comps. */
  neighborhood?: string;
  /** Lot area, used to compute a live floor area ratio (FAR) for the scenario. */
  lotSqft?: number | null;
  /** Zone label, used for the max-FAR estimate. */
  zoning?: string | null;
}) {
  const ensure = useDealStore((s) => s.ensure);
  const setField = useDealStore((s) => s.setField);
  const setUnits = useDealStore((s) => s.setUnits);
  const resetGroup = useDealStore((s) => s.resetGroup);

  useEffect(() => {
    ensure(dealId, initialInputs);
  }, [dealId, initialInputs, ensure]);

  const storeInputs = useDealInputs(dealId);
  const storeDefaults = useDealDefaults(dealId);
  const inputs = storeInputs ?? initialInputs;
  const defaults = storeDefaults ?? initialInputs;
  const result = computeFeasibility(inputs);

  const newBuild = inputs.hard.buildableSqft * inputs.hard.costPerSqft;
  const rehab = (inputs.hard.rehabSqft ?? 0) * (inputs.hard.rehabCostPerSqft ?? 0);
  const hb = inputs.hard.hardCostOverride ?? newBuild + rehab;

  // Floor area ratio — recomputed live as buildable/rehab area changes.
  const proposedFloorArea = inputs.hard.buildableSqft + (inputs.hard.rehabSqft ?? 0);
  const far = computeFar(proposedFloorArea, lotSqft);
  const maxFar = maxFarForZone(zoning);
  const farOverMax = far.ratio != null && maxFar != null && far.ratio > maxFar;

  // ARV (after-repair / total resale value) is the per-unit price across all
  // units. Editable from either side: changing one updates the other.
  const perUnit = inputs.exit.salePricePerUnit ?? 0;
  const arv = perUnit * inputs.units;
  const comps = suggestComps({
    neighborhood,
    units: inputs.units,
    buildableSqft: inputs.hard.buildableSqft,
  });
  const compsApplied = perUnit === comps.pricePerUnit;

  function edited<G extends DealGroup, K extends keyof DealInputs[G]>(g: G, k: K): boolean {
    return inputs[g][k] !== defaults[g][k];
  }
  function set<G extends DealGroup, K extends keyof DealInputs[G]>(
    g: G,
    k: K,
    v: DealInputs[G][K]
  ) {
    setField(dealId, g, k, v);
  }

  const verdict = verdictFromMargin(result.marginOnCost);
  const marginColor =
    verdict === "PENCILS" ? "var(--green)" : verdict === "TIGHT" ? "var(--amber)" : "var(--red)";

  return (
    <section aria-label="Deal assumptions" className="space-y-3">
      {/* Live result strip */}
      {showResult && (
      <div className="pa-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <VerdictPill verdict={verdict} size="md" />
          <span className="pa-mono text-3xl font-medium leading-none" style={{ color: marginColor }}>
            {pct(result.marginOnCost)}
          </span>
          <span className="text-sm" style={{ color: "var(--slate)" }}>
            margin on cost
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Figure label="Total cost" value={usd(result.costBreakdown.total)} />
          <Figure label="Profit" value={usd(result.profit)} accent={result.profit >= 0} />
          <Figure label="Equity" value={usd(result.equityRequired)} />
          <Figure label="Return on equity" value={pct(result.returnOnEquity)} />
        </dl>
        {inputs.exit.strategy === "hold_rent" && result.stabilizedValue != null && (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Stabilized value" value={usd(result.stabilizedValue)} />
            <Figure label="Yield on cost" value={pct(result.yieldOnCost ?? 0)} />
          </dl>
        )}
        <p className="pa-mono mt-3 text-xs" style={{ color: "var(--slate)" }}>
          Sensitivity · hard cost +10% → {pct(result.sensitivity.hardCostPlus10)} · sale price −10% →{" "}
          {pct(result.sensitivity.salePriceMinus10)}
        </p>
      </div>
      )}

      {/* Acquisition */}
      <AssumptionGroup
        title="Acquisition"
        rolledValue={usd(result.costBreakdown.acquisition)}
        onReset={() => resetGroup(dealId, "acquisition")}
      >
        <AssumptionField
          kind="currency"
          label="Purchase price"
          value={inputs.acquisition.purchasePrice}
          edited={edited("acquisition", "purchasePrice")}
          note={`default ${usd(defaults.acquisition.purchasePrice)}`}
          min={0}
          onChange={(v) => set("acquisition", "purchasePrice", v as number)}
        />
        <AssumptionField
          kind="percent"
          label="Closing costs"
          value={inputs.acquisition.closingCostsPct}
          edited={edited("acquisition", "closingCostsPct")}
          note={usd(inputs.acquisition.purchasePrice * (inputs.acquisition.closingCostsPct / 100))}
          min={0}
          max={10}
          onChange={(v) => set("acquisition", "closingCostsPct", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Demo & site prep"
          value={inputs.acquisition.demoSitePrep}
          edited={edited("acquisition", "demoSitePrep")}
          note={`default ${usd(defaults.acquisition.demoSitePrep)}`}
          min={0}
          onChange={(v) => set("acquisition", "demoSitePrep", v as number)}
        />
      </AssumptionGroup>

      {/* Hard costs — new build and rehab tracked separately, totaled at the header */}
      <AssumptionGroup
        title="Hard costs"
        rolledValue={usd(result.costBreakdown.hard)}
        onReset={() => resetGroup(dealId, "hard")}
      >
        <SubLabel label="New build" value={usd(newBuild)} />
        <AssumptionField
          kind="number"
          label="Buildable sq ft"
          value={inputs.hard.buildableSqft}
          edited={edited("hard", "buildableSqft")}
          note={`default ${defaults.hard.buildableSqft.toLocaleString()}`}
          min={0}
          step={50}
          onChange={(v) => set("hard", "buildableSqft", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Cost per sq ft"
          value={inputs.hard.costPerSqft}
          edited={edited("hard", "costPerSqft")}
          note={usd(newBuild)}
          min={0}
          step={5}
          onChange={(v) => set("hard", "costPerSqft", v as number)}
        />

        <SubLabel label="Rehab / remodel" value={usd(rehab)} />
        <AssumptionField
          kind="number"
          label="Rehab sq ft"
          value={inputs.hard.rehabSqft}
          edited={edited("hard", "rehabSqft")}
          note={`default ${defaults.hard.rehabSqft.toLocaleString()}`}
          min={0}
          step={50}
          onChange={(v) => set("hard", "rehabSqft", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Rehab cost per sq ft"
          value={inputs.hard.rehabCostPerSqft}
          edited={edited("hard", "rehabCostPerSqft")}
          note={usd(rehab)}
          min={0}
          step={5}
          onChange={(v) => set("hard", "rehabCostPerSqft", v as number)}
        />

        {lotSqft != null && lotSqft > 0 && (
          <div
            className="mt-2 flex items-center justify-between gap-3 rounded-[6px] px-3 py-2.5"
            style={{ background: farOverMax ? "var(--amber-tint, #fdf6e7)" : "var(--green-tint)" }}
          >
            <div className="min-w-0">
              <p className="text-sm" style={{ color: "var(--ink)" }}>
                Floor area ratio (FAR)
              </p>
              <p className="pa-mono text-xs" style={{ color: "var(--slate)" }}>
                {proposedFloorArea.toLocaleString()} sq ft floor ÷ {Math.round(lotSqft).toLocaleString()} sq ft lot
                {maxFar != null ? ` · max ~${maxFar.toFixed(2)} est.` : ""}
              </p>
            </div>
            <span
              className="pa-mono shrink-0 text-lg font-medium"
              style={{ color: farOverMax ? "var(--amber)" : "var(--green)" }}
              title={farOverMax ? "Above the estimated max FAR for this zone" : undefined}
            >
              {far.display}
            </span>
          </div>
        )}

        <SubLabel label="Subtotal + contingency" value={usd(result.costBreakdown.hard)} />
        <AssumptionField
          kind="percent"
          label="Contingency"
          value={inputs.hard.contingencyPct}
          edited={edited("hard", "contingencyPct")}
          note={usd(hb * (inputs.hard.contingencyPct / 100))}
          min={0}
          max={30}
          onChange={(v) => set("hard", "contingencyPct", v as number)}
        />
      </AssumptionGroup>

      {/* Soft costs */}
      <AssumptionGroup
        title="Soft costs"
        rolledValue={usd(result.costBreakdown.soft)}
        onReset={() => resetGroup(dealId, "soft")}
      >
        <AssumptionField
          kind="percent"
          label="Architecture"
          value={inputs.soft.architecturePct}
          edited={edited("soft", "architecturePct")}
          note={usd(hb * (inputs.soft.architecturePct / 100))}
          min={0}
          max={20}
          onChange={(v) => set("soft", "architecturePct", v as number)}
        />
        <AssumptionField
          kind="percent"
          label="Engineering"
          value={inputs.soft.engineeringPct}
          edited={edited("soft", "engineeringPct")}
          note={usd(hb * (inputs.soft.engineeringPct / 100))}
          min={0}
          max={20}
          onChange={(v) => set("soft", "engineeringPct", v as number)}
        />
        <AssumptionField
          kind="percent"
          label="Project management"
          value={inputs.soft.projectMgmtPct}
          edited={edited("soft", "projectMgmtPct")}
          note={usd(hb * (inputs.soft.projectMgmtPct / 100))}
          min={0}
          max={20}
          onChange={(v) => set("soft", "projectMgmtPct", v as number)}
        />
        <AssumptionField
          kind="percent"
          label="Insurance"
          value={inputs.soft.insurancePct}
          edited={edited("soft", "insurancePct")}
          note={usd(hb * (inputs.soft.insurancePct / 100))}
          min={0}
          max={10}
          onChange={(v) => set("soft", "insurancePct", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Permits & fees"
          value={inputs.soft.permitsAndFees}
          edited={edited("soft", "permitsAndFees")}
          note={`default ${usd(defaults.soft.permitsAndFees)}`}
          min={0}
          onChange={(v) => set("soft", "permitsAndFees", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Survey & environmental"
          value={inputs.soft.surveyEnviro}
          edited={edited("soft", "surveyEnviro")}
          note={`default ${usd(defaults.soft.surveyEnviro)}`}
          min={0}
          onChange={(v) => set("soft", "surveyEnviro", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Legal & accounting"
          value={inputs.soft.legalAccounting}
          edited={edited("soft", "legalAccounting")}
          note={`default ${usd(defaults.soft.legalAccounting)}`}
          min={0}
          onChange={(v) => set("soft", "legalAccounting", v as number)}
        />
      </AssumptionGroup>

      {/* Financing */}
      <AssumptionGroup
        title="Financing & carry"
        rolledValue={usd(result.costBreakdown.financing)}
        onReset={() => resetGroup(dealId, "financing")}
      >
        <AssumptionField
          kind="percent"
          label="Loan to cost"
          value={inputs.financing.loanToCostPct}
          edited={edited("financing", "loanToCostPct")}
          note={`loan ${usd(result.loanAmount)}`}
          min={0}
          max={90}
          onChange={(v) => set("financing", "loanToCostPct", v as number)}
        />
        <AssumptionField
          kind="percent"
          label="Interest rate"
          value={inputs.financing.interestRatePct}
          edited={edited("financing", "interestRatePct")}
          min={0}
          max={20}
          onChange={(v) => set("financing", "interestRatePct", v as number)}
        />
        <AssumptionField
          kind="number"
          label="Build months"
          value={inputs.financing.buildMonths}
          edited={edited("financing", "buildMonths")}
          min={1}
          max={48}
          onChange={(v) => set("financing", "buildMonths", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Property tax / mo"
          value={inputs.financing.propertyTaxMonthly}
          edited={edited("financing", "propertyTaxMonthly")}
          min={0}
          step={50}
          onChange={(v) => set("financing", "propertyTaxMonthly", v as number)}
        />
        <AssumptionField
          kind="currency"
          label="Utilities & maint / mo"
          value={inputs.financing.utilitiesMaintMonthly}
          edited={edited("financing", "utilitiesMaintMonthly")}
          min={0}
          step={50}
          onChange={(v) => set("financing", "utilitiesMaintMonthly", v as number)}
        />
      </AssumptionGroup>

      {/* Exit */}
      <AssumptionGroup
        title="Exit"
        rolledValue={usd(result.grossRevenue)}
        onReset={() => resetGroup(dealId, "exit")}
      >
        <AssumptionField
          kind="number"
          label="Units"
          value={inputs.units}
          edited={inputs.units !== defaults.units}
          note={`default ${defaults.units}`}
          min={1}
          max={24}
          onChange={(v) => setUnits(dealId, v as number)}
        />
        <div className="py-2">
          <p className="mb-2 text-sm" style={{ color: "var(--ink)" }}>
            Strategy
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STRATEGY_LABELS) as ExitStrategy[]).map((s) => {
              const active = inputs.exit.strategy === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("exit", "strategy", s)}
                  className={`pa-chip ${active ? "pa-chip-active" : ""}`}
                >
                  {STRATEGY_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        {inputs.exit.strategy === "hold_rent" ? (
          <>
            <AssumptionField
              kind="currency"
              label="Rent / unit / mo"
              value={inputs.exit.rentPerUnitMonthly ?? 0}
              edited={edited("exit", "rentPerUnitMonthly")}
              note={`${inputs.units} units`}
              min={0}
              step={50}
              onChange={(v) => set("exit", "rentPerUnitMonthly", v as number)}
            />
            <AssumptionField
              kind="percent"
              label="Vacancy"
              value={inputs.exit.vacancyPct ?? 0}
              edited={edited("exit", "vacancyPct")}
              min={0}
              max={30}
              onChange={(v) => set("exit", "vacancyPct", v as number)}
            />
            <AssumptionField
              kind="percent"
              label="Cap rate"
              value={inputs.exit.capRatePct ?? 0}
              edited={edited("exit", "capRatePct")}
              min={1}
              max={12}
              onChange={(v) => set("exit", "capRatePct", v as number)}
            />
          </>
        ) : (
          <>
            <AssumptionField
              kind="currency"
              label="Sale price / unit"
              value={inputs.exit.salePricePerUnit ?? 0}
              edited={edited("exit", "salePricePerUnit")}
              note={`${inputs.units} units → ${usd(arv)} ARV`}
              min={0}
              step={5000}
              onChange={(v) => set("exit", "salePricePerUnit", v as number)}
            />
            <AssumptionField
              kind="currency"
              label="ARV (total resale value)"
              value={arv}
              edited={edited("exit", "salePricePerUnit")}
              note={`${usd(perUnit)} / unit × ${inputs.units}`}
              min={0}
              step={10000}
              onChange={(v) =>
                set("exit", "salePricePerUnit", Math.round((v as number) / Math.max(inputs.units, 1)))
              }
            />
            <SuggestionRow
              text={`Comps suggest ${usd(comps.pricePerUnit)} / unit · ${usd(comps.arv)} ARV`}
              hint={comps.basis}
              applied={compsApplied}
              onApply={() => set("exit", "salePricePerUnit", comps.pricePerUnit)}
            />
          </>
        )}

        <AssumptionField
          kind="percent"
          label="Selling costs"
          value={inputs.exit.sellingCostsPct}
          edited={edited("exit", "sellingCostsPct")}
          note={usd(result.sellingCosts)}
          min={0}
          max={12}
          onChange={(v) => set("exit", "sellingCostsPct", v as number)}
        />
      </AssumptionGroup>
    </section>
  );
}

function SuggestionRow({
  text,
  hint,
  applied,
  onApply,
}: {
  text: string;
  hint: string;
  applied: boolean;
  onApply: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[6px] px-3 py-2.5"
      style={{ background: "var(--green-tint)" }}
    >
      <div className="min-w-0">
        <p className="text-sm" style={{ color: "var(--ink)" }}>
          {text}
        </p>
        <p className="pa-mono text-xs" style={{ color: "var(--slate)" }}>
          {hint}
        </p>
      </div>
      <button
        type="button"
        className="pa-btn pa-btn-sm shrink-0"
        onClick={onApply}
        disabled={applied}
      >
        {applied ? "Applied" : "Use comps"}
      </button>
    </div>
  );
}

function SubLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between pt-3 pb-1">
      <span className="pa-eyebrow" style={{ color: "var(--slate)" }}>
        {label}
      </span>
      <span className="pa-mono text-sm font-medium" style={{ color: "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="pa-eyebrow" style={{ color: "var(--slate)" }}>
        {label}
      </dt>
      <dd className="pa-mono text-base font-medium" style={{ color: accent ? "var(--green)" : "var(--ink)" }}>
        {value}
      </dd>
    </div>
  );
}
