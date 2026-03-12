"use client";

import { useMemo, useState } from "react";
import { rankScenariosByEconomics, buildScenariosForOptions, RENT_RANGE } from "@/lib/scenario-economics";
import type {
  BuildScenario,
  ScenarioEconomics,
  UserScenarioInputs,
} from "@/lib/scenario-economics";
import type { HousingOption } from "@/lib/adu-analysis";
import type { ADUReport } from "@/lib/adu-analysis";
import type { FeasibilityResult } from "@/lib/feasibility";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronDown, ChevronUp, Info, AlertTriangle, Settings2 } from "lucide-react";

/* ── Profitability Meter ── */
function ProfitabilityMeter({ margin }: { margin: number }) {
  const level =
    margin >= 15 ? "Strong" : margin >= 10 ? "Moderate" : margin >= 5 ? "Low" : "Weak";
  const pct = Math.min(100, Math.max(0, margin));
  const bgClass =
    level === "Strong"
      ? "bg-[var(--foreground)]"
      : level === "Moderate"
        ? "bg-[var(--foreground)]/70"
        : level === "Low"
          ? "bg-amber-500"
          : "bg-amber-600/60";

  return (
    <div className="space-y-2" role="img" aria-label={`Profitability: ${level}`}>
      <div className="flex justify-between text-xs">
        <span className="text-[var(--muted-foreground)]">Profitability</span>
        <span className="font-medium">{level}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-[var(--muted)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bgClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Margin Badge ── */
function MarginBadge({ margin }: { margin: number }) {
  const strong = margin >= 15;
  const moderate = margin >= 10;
  const tight = margin >= 5 && margin < 10;

  return (
    <div
      className={`inline-flex items-center px-4 py-2 rounded-sm font-display text-lg tabular-nums ${
        strong
          ? "border border-[var(--foreground)] bg-[rgba(44,74,59,0.08)]"
          : moderate
            ? "border border-[var(--foreground)]/60 bg-[rgba(44,74,59,0.04)]"
            : tight
              ? "border border-amber-600/50 bg-amber-500/5"
              : "border border-amber-600/60 bg-amber-500/10"
      }`}
    >
      {margin.toFixed(1)}% margin
    </div>
  );
}

/* ── Cost Stack Bar ── */
function CostStackBar({ economics }: { economics: ScenarioEconomics }) {
  const {
    purchasePrice,
    constructionBudget,
    softCosts,
    archAndPermitFees,
    holdingCosts,
    condoizationFees,
    financingCost,
    salesAndClosingCosts,
    profitDollars,
  } = economics;
  const totalCosts =
    purchasePrice +
    constructionBudget +
    softCosts +
    archAndPermitFees +
    holdingCosts +
    condoizationFees +
    financingCost +
    salesAndClosingCosts +
    Math.abs(profitDollars);
  const maxVal = Math.max(economics.finishedValue, totalCosts);

  const segments = [
    { label: "Acquisition", value: purchasePrice, color: "bg-[var(--foreground)]/40" },
    { label: "Construction", value: constructionBudget, color: "bg-[var(--foreground)]/60" },
    { label: "Soft costs", value: softCosts, color: "bg-[var(--foreground)]/25" },
    { label: "Arch / permits", value: archAndPermitFees, color: "bg-[var(--foreground)]/20" },
    { label: "Holding", value: holdingCosts, color: "bg-[var(--muted-foreground)]/30" },
    { label: "Condoization", value: condoizationFees, color: "bg-[var(--muted-foreground)]/25" },
    { label: "Financing", value: financingCost, color: "bg-amber-500/30" },
    {
      label: "Sales / Carry / Close",
      value: salesAndClosingCosts,
      color: "bg-[var(--muted-foreground)]/40",
    },
    {
      label: profitDollars >= 0 ? "Profit" : "Shortfall",
      value: Math.abs(profitDollars),
      color: profitDollars >= 0 ? "bg-[var(--foreground)]" : "bg-amber-500/70",
    },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted-foreground)]">Cost breakdown</p>
      <div
        className="flex h-8 rounded-sm overflow-hidden"
        role="img"
        aria-label={`Cost stack: Land ${purchasePrice}, Construction ${constructionBudget}, Soft costs ${softCosts}, Sales ${salesAndClosingCosts}, Profit ${profitDollars}`}
      >
        {segments.map((s, i) => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{
              width: `${maxVal > 0 ? (s.value / maxVal) * 100 : 0}%`,
              minWidth: s.value > 0 ? 4 : 0,
            }}
            title={`${s.label}: $${s.value.toLocaleString()}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
        {segments.map((s) => (
          <span key={s.label}>
            {s.label}: ${(s.value / 1000).toFixed(0)}k
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Value vs Cost Comparison ── */
function ValueVsCostBar({ economics }: { economics: ScenarioEconomics }) {
  const { finishedValue, projectCosts } = economics;
  const maxVal = Math.max(finishedValue, projectCosts);
  const valuePct = maxVal > 0 ? (finishedValue / maxVal) * 100 : 0;
  const costPct = maxVal > 0 ? (projectCosts / maxVal) * 100 : 0;

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted-foreground)]">Value vs costs</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs shrink-0">Value</span>
          <div className="flex-1 h-2 rounded-sm overflow-hidden bg-[var(--muted)]">
            <div
              className="h-full bg-[var(--foreground)] rounded-sm"
              style={{ width: `${valuePct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums w-16 text-right">${(finishedValue / 1000).toFixed(0)}k</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 text-xs shrink-0">Costs</span>
          <div className="flex-1 h-2 rounded-sm overflow-hidden bg-[var(--muted)]">
            <div
              className="h-full bg-[var(--muted-foreground)]/50 rounded-sm"
              style={{ width: `${costPct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums w-16 text-right">${(projectCosts / 1000).toFixed(0)}k</span>
        </div>
      </div>
    </div>
  );
}

/* ── Economics Metric Grid ── */
function EconomicsMetricGrid({
  economics,
  compact = false,
}: {
  economics: ScenarioEconomics;
  compact?: boolean;
}) {
  const fmt = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toFixed(0);
  const rentRange = RENT_RANGE[economics.assumptions?.optionType ?? ""];
  const rows = [
    ...(rentRange ? [{ label: "Est. monthly rent", value: `$${rentRange.min.toLocaleString()}–${(rentRange.max / 1000).toFixed(1)}k` }] : []),
    { label: "Construction cost", value: `$${economics.constructionCostPerSqFt}/sq ft` },
    { label: "Acquisition", value: fmt(economics.landAcquisitionCost) },
    { label: "Construction budget", value: fmt(economics.constructionBudget) },
    { label: "Soft costs", value: fmt(economics.softCosts) },
    { label: "Arch / permits", value: fmt(economics.archAndPermitFees) },
    { label: "Holding costs", value: fmt(economics.holdingCosts) },
    ...(economics.condoizationFees > 0
      ? [{ label: "Condoization", value: fmt(economics.condoizationFees) }]
      : []),
    ...(economics.financingCost > 0
      ? [{ label: "Financing", value: fmt(economics.financingCost) }]
      : []),
    { label: "Project costs", value: fmt(economics.projectCosts) },
    { label: "Finished value", value: fmt(economics.finishedValue) },
    { label: "Sales / carry / closing", value: fmt(economics.salesAndClosingCosts) },
    { label: "Potential profit", value: fmt(economics.profitDollars) },
    { label: "Land cost % of value", value: `${economics.landCostPctOfValue.toFixed(1)}%` },
    { label: "Acq + const % of value", value: `${economics.acqAndConstPctOfValue.toFixed(1)}%` },
  ];
  if (economics.cashOnCash != null && !compact) {
    rows.push({ label: "Cash on cash", value: `${economics.cashOnCash.toFixed(1)}%` });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex flex-col">
          <span className="text-[10px] uppercase text-[var(--muted-foreground)]">{label}</span>
          <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Assumptions Drawer ── */
function AssumptionsDrawer({ assumptions }: { assumptions: BuildScenario["assumptions"] }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="assumptions" className="border-0">
        <AccordionTrigger className="py-2 text-xs text-[var(--muted-foreground)] hover:no-underline [&[data-state=open]>svg]:rotate-180">
          <span className="flex items-center gap-2">
            <Info className="size-3.5" />
            View assumptions
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <ul className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
            {assumptions.notes.map((note, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--foreground)]/50">•</span>
                {note}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-3 italic">
            Confidence: {assumptions.scenarioConfidence}% — Planning-level only. Verify with full pro forma.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/* ── Single Build Option Card (expandable) ── */
function BuildOptionCard({ scenario, rankLabel }: { scenario: BuildScenario; rankLabel?: string }) {
  const [expanded, setExpanded] = useState(false);
  const { economics, housingOption, siteFit, risks } = scenario;

  const whatThisMeans =
    economics.recommendation === "Strong Candidate"
      ? "This option appears to have the strongest margin of the eligible build paths."
      : economics.recommendation === "Worth Reviewing"
        ? "This scenario may still work with disciplined costs. Worth a closer look."
        : economics.recommendation === "Tight Economics"
          ? "Costs look high relative to projected value. Build costs must stay disciplined."
          : "This scenario is high risk at planning estimates. Verify before pursuing.";

  return (
    <div
      className={`border rounded-sm overflow-hidden transition-colors ${
        housingOption.allowed
          ? "border-[var(--border)] bg-[var(--background)]"
          : "border-amber-600/30 bg-amber-500/5"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 text-left flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[var(--muted)]/30 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-xl text-[var(--foreground)]">{scenario.optionType}</h3>
            {rankLabel && (
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] px-2 py-0.5 border border-[var(--border)] rounded">
                {rankLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            ~{scenario.assumptions.estimatedSqFt} sq ft · {scenario.assumptions.constructionType}
            {getRentLabel(scenario.optionType) !== "—" && (
              <> · Est. rent {getRentLabel(scenario.optionType)}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <MarginBadge margin={economics.profitMargin} />
          <span
            className={`text-xs font-medium ${
              economics.recommendation === "Strong Candidate"
                ? "text-[var(--foreground)]"
                : economics.recommendation === "Tight Economics" || economics.recommendation === "High Risk"
                  ? "text-amber-700"
                  : "text-[var(--muted-foreground)]"
            }`}
          >
            {economics.recommendation}
          </span>
          {expanded ? (
            <ChevronUp className="size-5 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="size-5 text-[var(--muted-foreground)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] p-6 space-y-8 bg-[var(--background)]">
          <div>
            <h4 className="font-display text-sm mb-2">Summary</h4>
            <p className="text-sm text-[var(--muted-foreground)]">
              {housingOption.type}: ~{scenario.assumptions.estimatedUnits ?? 1} unit
              {((scenario.assumptions.estimatedUnits ?? 1) > 1 ? "s" : "")} · ~
              {scenario.assumptions.estimatedSqFt} sq ft. {whatThisMeans}
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm mb-2">Site fit</h4>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">{siteFit.whyEligible}</p>
            {siteFit.advantages.length > 0 && (
              <ul className="space-y-1 text-xs">
                {siteFit.advantages.slice(0, 3).map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--foreground)]">+</span>
                    {a}
                  </li>
                ))}
              </ul>
            )}
            {siteFit.constraints.length > 0 && (
              <ul className="space-y-1 text-xs mt-2">
                {siteFit.constraints.slice(0, 3).map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <AlertTriangle className="size-3 shrink-0 text-amber-600" />
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="font-display text-sm mb-2">Preliminary economics</h4>
            <p className="text-[11px] text-[var(--muted-foreground)] mb-4">
              Planning-level estimates. Verify with full underwriting.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <EconomicsMetricGrid economics={economics} compact />
              <div className="space-y-4">
                <ProfitabilityMeter margin={economics.profitMargin} />
                <CostStackBar economics={economics} />
                <ValueVsCostBar economics={economics} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm mb-2">Risks</h4>
            <ul className="space-y-1.5 text-xs text-[var(--muted-foreground)]">
              {risks.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-600 shrink-0">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm mb-2">Recommendation</h4>
            <p className="text-sm text-[var(--foreground)]">{economics.recommendation}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 italic">
              This is a planning-level estimate. Verify with a full pro forma before purchase.
            </p>
          </div>

          <AssumptionsDrawer assumptions={scenario.assumptions} />
        </div>
      )}
    </div>
  );
}

/* ── Scenario Ranking Header ── */
function ScenarioRankingHeader({ ranked }: { ranked: BuildScenario[] }) {
  const labels = ["Best economics", "Moderate economics", "Weaker economics"];
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {ranked.slice(0, 3).map((s, i) => (
        <div
          key={s.optionType}
          className="inline-flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)]"
        >
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            {labels[i] ?? `${i + 1}.`}
          </span>
          <span className="font-display font-medium">{s.optionType}</span>
          <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
            {s.economics.profitMargin.toFixed(1)}% margin
          </span>
        </div>
      ))}
    </div>
  );
}

function getRentLabel(optionType: string): string {
  const range = RENT_RANGE[optionType];
  if (!range) return "—";
  const maxK = range.max >= 1000 ? `${(range.max / 1000).toFixed(1)}k` : String(range.max);
  return `$${range.min.toLocaleString()}–${maxK}/mo`;
}

/* ── Comparison Table (compact) ── */
function ScenarioComparisonTable({ ranked }: { ranked: BuildScenario[] }) {
  const fmt = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`);
  return (
    <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
      <table className="w-full text-sm border-collapse" role="table">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 pr-4 font-medium text-[var(--foreground)]">Option</th>
            <th className="text-right py-3 px-2 tabular-nums">Sq Ft</th>
            <th className="text-right py-3 px-2 tabular-nums">Est. Rent</th>
            <th className="text-right py-3 px-2 tabular-nums">Cost</th>
            <th className="text-right py-3 px-2 tabular-nums">Value</th>
            <th className="text-right py-3 px-2 tabular-nums">Profit</th>
            <th className="text-right py-3 px-2 tabular-nums">Margin</th>
            <th className="text-left py-3 pl-4">Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s) => (
            <tr key={s.optionType} className="border-b border-[var(--border)]">
              <td className="py-3 pr-4 font-medium">{s.optionType}</td>
              <td className="text-right py-3 px-2 tabular-nums">~{s.assumptions.estimatedSqFt}</td>
              <td className="text-right py-3 px-2 tabular-nums text-[var(--muted-foreground)]">{getRentLabel(s.optionType)}</td>
              <td className="text-right py-3 px-2 tabular-nums">{fmt(s.economics.projectCosts)}</td>
              <td className="text-right py-3 px-2 tabular-nums">{fmt(s.economics.finishedValue)}</td>
              <td className="text-right py-3 px-2 tabular-nums">{fmt(s.economics.profitDollars)}</td>
              <td className="text-right py-3 px-2 tabular-nums">{s.economics.profitMargin.toFixed(1)}%</td>
              <td className="py-3 pl-4 text-[var(--muted-foreground)]">{s.economics.recommendation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getDefaultAcquisition(result: FeasibilityResult): number {
  const p = result.parcel;
  const landVal = p?.landValue ?? 0;
  const imprVal = p?.improvementValue ?? 0;
  if (landVal > 0 || imprVal > 0) return landVal + imprVal;
  const lotSqft = p?.lotSqft ?? result.feasibility?.shapeArea ?? 0;
  return lotSqft > 0 ? lotSqft * 200 : 650000;
}

/* ── User Inputs Panel ── */
function EconomicsInputsPanel({
  result,
  userInputs,
  onChange,
}: {
  result: FeasibilityResult;
  userInputs: UserScenarioInputs;
  onChange: (u: UserScenarioInputs) => void;
}) {
  const defaultAcq = getDefaultAcquisition(result);
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof UserScenarioInputs, value: number | null) => {
    onChange({ ...userInputs, [key]: value });
  };

  const parseNum = (v: string): number | null => {
    const cleaned = v.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };
  /* Enter 750 → $750k, 750000 → $750k */
  const parseAcquisition = (v: string): number | null => {
    const n = parseNum(v);
    if (n == null) return null;
    return n >= 1000 ? n : n * 1000;
  };
  /* Enter 17 → $17k, 17500 → $17.5k */
  const parseFees = (v: string): number | null => {
    const n = parseNum(v);
    if (n == null) return null;
    return n >= 1000 ? n : n * 1000;
  };

  return (
    <div className="mb-6 border border-[var(--border)] rounded-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--muted)]/30 transition-colors"
      >
        <span className="flex items-center gap-2 font-display text-base">
          <Settings2 className="size-4" />
          Adjust your numbers
        </span>
        <ChevronDown className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t border-[var(--border)] space-y-4">
          <p className="text-xs text-[var(--muted-foreground)]">
            Enter your estimates for more accurate economics. Scenario: buy house (backyard included), build in backyard.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-[var(--muted-foreground)] mb-1">
                Acquisition cost
              </label>
              <input
                type="text"
                placeholder={`${(defaultAcq / 1000).toFixed(0)}k (assessed)`}
                value={userInputs.acquisitionCost != null ? String(userInputs.acquisitionCost) : ""}
                onChange={(e) => update("acquisitionCost", parseAcquisition(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[var(--muted-foreground)] mb-1">
                Financing interest %
              </label>
              <input
                type="text"
                placeholder="0"
                value={userInputs.financingInterestRate != null ? String(userInputs.financingInterestRate) : ""}
                onChange={(e) => update("financingInterestRate", parseNum(e.target.value) ?? 0)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[var(--muted-foreground)] mb-1">
                Arch / permit fees
              </label>
              <input
                type="text"
                placeholder="15–20k"
                value={userInputs.archAndPermitFees != null ? String(userInputs.archAndPermitFees) : ""}
                onChange={(e) => update("archAndPermitFees", parseNum(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[var(--muted-foreground)] mb-1">
                Holding costs
              </label>
              <input
                type="text"
                placeholder="50–80k"
                value={userInputs.holdingCosts != null ? String(userInputs.holdingCosts) : ""}
                onChange={(e) => update("holdingCosts", parseFees(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[var(--muted-foreground)] mb-1">
                Condoization fees
              </label>
              <input
                type="text"
                placeholder="0"
                value={userInputs.condoizationFees != null ? String(userInputs.condoizationFees) : ""}
                onChange={(e) => update("condoizationFees", parseNum(e.target.value) ?? 0)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[var(--muted-foreground)] mb-1">
                Soft costs
              </label>
              <input
                type="text"
                placeholder="75k"
                value={userInputs.softCosts != null ? String(userInputs.softCosts) : ""}
                onChange={(e) => update("softCosts", parseFees(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-[var(--muted-foreground)] mb-1">
                ARV per sq ft
              </label>
              <input
                type="text"
                placeholder="450–550"
                value={userInputs.valuePerSqFt != null ? String(userInputs.valuePerSqFt) : ""}
                onChange={(e) => update("valuePerSqFt", parseNum(e.target.value))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-sm bg-[var(--background)] text-sm tabular-nums"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface BuildOptionEconomicsSectionProps {
  options: HousingOption[];
  report: ADUReport;
  result: FeasibilityResult;
}

export function BuildOptionEconomicsSection({ options, report, result }: BuildOptionEconomicsSectionProps) {
  const [userInputs, setUserInputs] = useState<UserScenarioInputs>({});

  const scenarios = useMemo(
    () => buildScenariosForOptions(options, report, result, userInputs),
    [options, report, result, userInputs]
  );

  const { ranked } = rankScenariosByEconomics(scenarios);

  if (ranked.length === 0) return null;

  const rankLabels: Record<number, string> = {
    0: "Best economics",
    1: "Moderate economics",
    2: "Weaker economics",
  };

  return (
    <section
      className="p-6 md:p-8 border-b border-[var(--border)]"
      aria-labelledby="build-option-economics-heading"
    >
      <h2 id="build-option-economics-heading" className="font-display text-2xl mb-2">
        Build Option Economics
      </h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-2xl">
        Preliminary scenario analysis. Enter your numbers below for more accurate estimates. Scenario: buy the house (backyard included), build in backyard.
      </p>

      <EconomicsInputsPanel result={result} userInputs={userInputs} onChange={setUserInputs} />

      <ScenarioRankingHeader ranked={ranked} />

      <div className="mb-6">
        <p className="text-xs text-[var(--muted-foreground)] mb-3">Quick comparison</p>
        <ScenarioComparisonTable ranked={ranked} />
      </div>

      <p className="text-xs text-[var(--muted-foreground)] mb-4">Expand for details</p>
      <div className="space-y-4">
        {ranked.map((s, i) => (
          <BuildOptionCard
            key={s.optionType}
            scenario={s}
            rankLabel={rankLabels[i]}
          />
        ))}
      </div>
    </section>
  );
}
