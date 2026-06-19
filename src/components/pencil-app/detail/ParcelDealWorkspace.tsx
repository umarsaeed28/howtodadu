"use client";

import { useEffect, useMemo } from "react";
import type { Parcel } from "@/lib/parcels";
import { verdictFromMargin } from "@/lib/parcels";
import { computeFeasibility, type DealInputs } from "@/lib/feasibility/model";
import { BUILD_TYPES, buildTypeFor, parcelToDealInputs } from "@/lib/feasibility/defaults";
import { useDealStore, useDealInputs } from "@/lib/deal-store";
import AssumptionsPanel from "@/components/inputs/AssumptionsPanel";
import VerdictBlock from "./VerdictBlock";
import ProForma from "./ProForma";
import ScenarioTiles, { type ScenarioTile } from "./ScenarioTiles";

/**
 * Client workspace for the parcel detail page. Holds the deal inputs for this
 * parcel and feeds the verdict, pro forma, and scenarios from a single live
 * DealResult, so editing any assumption moves the whole page instantly.
 */
export default function ParcelDealWorkspace({ parcel }: { parcel: Parcel }) {
  const initialInputs = useMemo(() => parcelToDealInputs(parcel), [parcel]);
  const ensure = useDealStore((s) => s.ensure);
  const setInputs = useDealStore((s) => s.setInputs);

  useEffect(() => {
    ensure(parcel.id, initialInputs);
  }, [parcel.id, initialInputs, ensure]);

  const inputs = useDealInputs(parcel.id) ?? initialInputs;
  const result = computeFeasibility(inputs);
  const honest = verdictFromMargin(result.marginOnCost) !== "PENCILS";

  // Build scenarios. The one matching current units reflects the live result so
  // it always agrees with the verdict; alternates reuse the current deal's cost
  // basis (only unit count, area, permits, and sale price vary) so they stay
  // comparable to the primary rather than mixing in unrelated defaults.
  const { tiles, scenarioInputs, selectedIndex } = useMemo(() => {
    const primaryUnits = Math.max(parcel.unitsUnlocked, 1);
    const altUnits = Math.max(primaryUnits - 2, 2);
    const defs: { name: string; units: number; type: ReturnType<typeof buildTypeFor> }[] = [
      { name: parcel.bestUse, units: primaryUnits, type: buildTypeFor(primaryUnits, parcel.bestUse) },
      {
        name: altUnits >= 4 ? `${altUnits}-plex` : `${altUnits} townhomes`,
        units: altUnits,
        type: buildTypeFor(altUnits),
      },
      { name: "SFR + DADU", units: 2, type: "sfr_dadu" },
    ];
    const seen = new Set<number>();
    const unique = defs.filter((d) => (seen.has(d.units) ? false : (seen.add(d.units), true)));

    const tiles: ScenarioTile[] = [];
    const scenarioInputs: DealInputs[] = [];
    let selectedIndex = 0;
    unique.forEach((d, i) => {
      if (d.units === inputs.units) {
        tiles.push({
          name: d.name,
          units: d.units,
          cost: result.costBreakdown.total,
          value: result.grossRevenue,
          margin: result.marginOnCost,
          buildableSqft: inputs.hard.buildableSqft,
        });
        scenarioInputs.push(inputs);
        selectedIndex = i;
      } else {
        const c = BUILD_TYPES[d.type];
        const si: DealInputs = {
          ...inputs,
          hard: { ...inputs.hard, buildableSqft: d.units * c.unitSqft, hardCostOverride: undefined },
          soft: { ...inputs.soft, permitsAndFees: c.permitsPerUnit * d.units },
          exit: { ...inputs.exit, salePricePerUnit: c.salePricePerUnit },
          units: d.units,
        };
        const r = computeFeasibility(si);
        tiles.push({
          name: d.name,
          units: d.units,
          cost: r.costBreakdown.total,
          value: r.grossRevenue,
          margin: r.marginOnCost,
          buildableSqft: si.hard.buildableSqft,
        });
        scenarioInputs.push(si);
      }
    });
    return { tiles, scenarioInputs, selectedIndex };
  }, [inputs, parcel, result]);

  return (
    <>
      <VerdictBlock parcel={parcel} result={result} />

      {honest && (
        <p
          className="rounded-[6px] border px-3 py-2.5 text-sm"
          style={{ borderColor: "var(--hairline)", color: "var(--slate)", background: "var(--card)" }}
        >
          This is a preliminary screen on sample data. A full feasibility study confirms the number
          with verified costs, financing, and site constraints before you commit.
        </p>
      )}

      <section aria-labelledby="assumptions-heading">
        <h2 id="assumptions-heading" className="pa-display mb-3 text-base">
          Assumptions
        </h2>
        <AssumptionsPanel
          dealId={parcel.id}
          initialInputs={initialInputs}
          showResult={false}
          neighborhood={parcel.neighborhood}
          lotSqft={parcel.lotSqft}
          zoning={parcel.zoning}
        />
      </section>

      <ProForma parcel={parcel} result={result} />

      <ScenarioTiles
        parcel={parcel}
        scenarios={tiles}
        selectedIndex={selectedIndex}
        onSelect={(_, i) => setInputs(parcel.id, scenarioInputs[i])}
      />
    </>
  );
}
