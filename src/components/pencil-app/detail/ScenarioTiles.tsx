"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import { usdM, pct } from "@/lib/format";

interface Scenario {
  name: string;
  units: number;
  cost: number;
  value: number;
  margin: number;
}

/** Build a scenario from a cost and a target margin so the parcel's stated
 *  best use always stays the highest-margin option. */
function fromMargin(name: string, units: number, cost: number, marginPct: number): Scenario {
  const m = Math.max(marginPct, -20);
  return {
    name,
    units,
    cost: Math.round(cost),
    value: Math.round(cost * (1 + m / 100)),
    margin: Number(m.toFixed(1)),
  };
}

function build(parcel: Parcel): Scenario[] {
  const best: Scenario = {
    name: parcel.bestUse,
    units: parcel.unitsUnlocked,
    cost: parcel.allInCost,
    value: parcel.projectedValue,
    margin: parcel.marginPct,
  };
  const altUnits = Math.max(parcel.unitsUnlocked - 2, 2);
  const alt = fromMargin(
    altUnits >= 4 ? `${altUnits}-plex` : `${altUnits} townhomes`,
    altUnits,
    parcel.allInCost * 0.82,
    parcel.marginPct - 5.3
  );
  const sfr = fromMargin("SFR + DADU", 2, parcel.allInCost * 0.42, parcel.marginPct - 11.4);

  const out = [best, alt, sfr].filter(
    (s, i, arr) => arr.findIndex((x) => x.name === s.name) === i
  );
  return out.slice(0, 3);
}

export interface ScenarioTile extends Scenario {
  /** Buildable area implied by this scenario, used to recompute on switch. */
  buildableSqft?: number;
}

export default function ScenarioTiles({
  parcel,
  scenarios: liveScenarios,
  selectedIndex,
  onSelect,
}: {
  parcel: Parcel;
  /** Live, model-computed scenarios. Falls back to the parcel illustration when omitted. */
  scenarios?: ScenarioTile[];
  selectedIndex?: number;
  onSelect?: (scenario: ScenarioTile, index: number) => void;
}) {
  const scenarios: ScenarioTile[] = liveScenarios ?? build(parcel);
  const bestIdx = scenarios.reduce(
    (b, s, i, arr) => (s.margin > arr[b].margin ? i : b),
    0
  );
  const [internalSelected, setInternalSelected] = useState(bestIdx);
  const selected = selectedIndex ?? internalSelected;

  return (
    <section>
      <h2 className="pa-display mb-3 text-base">What you can build</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {scenarios.map((s, i) => {
          const isBest = i === bestIdx;
          const isSel = i === selected;
          const marginColor =
            s.margin >= 15 ? "var(--green)" : s.margin >= 8 ? "var(--amber)" : "var(--red)";
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                setInternalSelected(i);
                onSelect?.(s, i);
              }}
              aria-pressed={isSel}
              className="pa-card p-4 text-left transition-transform"
              style={{
                borderColor: isSel ? "var(--green)" : "var(--hairline)",
                outline: isSel ? "1px solid var(--green)" : "none",
                transform: isSel ? "translateY(-2px)" : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.name}</span>
                {isBest && (
                  <span
                    className="pa-eyebrow flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ background: "var(--green-tint)", color: "var(--green)" }}
                  >
                    <Check size={11} aria-hidden /> Best
                  </span>
                )}
              </div>
              <p className="pa-mono mt-3 text-2xl font-medium" style={{ color: marginColor }}>
                {pct(s.margin)}
              </p>
              <dl className="mt-3 space-y-1 text-xs" style={{ color: "var(--slate)" }}>
                <div className="flex justify-between">
                  <dt>Units</dt>
                  <dd className="pa-mono" style={{ color: "var(--ink)" }}>{s.units}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Est. cost</dt>
                  <dd className="pa-mono" style={{ color: "var(--ink)" }}>{usdM(s.cost)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Est. value</dt>
                  <dd className="pa-mono" style={{ color: "var(--ink)" }}>{usdM(s.value)}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}
