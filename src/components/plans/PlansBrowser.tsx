"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlanCards from "@/components/home/PlanCards";
import LotBar from "./LotBar";
import { useLotFrame } from "./useLotFrame";
import { planFamilies } from "@/lib/preapproved-dadus";
import { planFitFor, type PlanFit } from "@/lib/site-envelope";

/**
 * The pre-approved plan grid. With a lot, every design is checked against it as drawn (footprint behind the
 * setbacks, turned either way, and the size limit), the ones that fit come first, and a filter hides the rest.
 */
export default function PlansBrowser() {
  const search = useSearchParams();
  const { state, setAddress, clear } = useLotFrame(search);
  const [onlyFits, setOnlyFits] = useState(false);
  const families = useMemo(() => planFamilies(), []);

  const fits = useMemo(() => {
    if (state.status !== "ready" || !state.frame) return undefined;
    const out: Record<string, PlanFit> = {};
    for (const vs of families) {
      // A design fits when any of its approved sizes fits.
      const each = vs.map((v) => planFitFor(state.frame!, v));
      out[vs[0].family] = each.find((f) => f.fits) ?? each[0];
    }
    return out;
  }, [state, families]);

  const shown = useMemo(() => {
    if (!fits) return families;
    const sorted = [...families].sort((a, b) => Number(fits[b[0].family].fits) - Number(fits[a[0].family].fits));
    return onlyFits ? sorted.filter((vs) => fits[vs[0].family].fits) : sorted;
  }, [families, fits, onlyFits]);
  const fitCount = fits ? Object.values(fits).filter((f) => f.fits).length : 0;
  const parcel = state.status === "ready" ? state.parcel.pin : null;

  return (
    <>
      <LotBar state={state} onAddress={setAddress} onClear={() => { clear(); setOnlyFits(false); }} prompt="Check every plan against your lot" />
      {fits && (
        <div className="plf">
          <p className="plf-count"><strong>{fitCount}</strong> of {families.length} designs fit your lot as drawn.</p>
          <label className="plf-toggle">
            <input type="checkbox" checked={onlyFits} onChange={(e) => setOnlyFits(e.target.checked)} />
            Show only plans that fit my lot
          </label>
        </div>
      )}
      {state.status === "ready" && !state.frame && <p className="plf-count">We could not read this lot&apos;s shape, so fit is not shown. Each plan page still lets you request it.</p>}
      {shown.length === 0 ? (
        <div className="plf-empty">
          <p>None of these designs fits this lot as drawn. Draw your own DADU on the plan in your feasibility report, and our architects can make it a custom plan.</p>
          <a className="s-btn s-btn--primary" href={parcel ? `/feasibility?parcel=${parcel}` : "/feasibility"}>Open my feasibility report</a>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Designs</h2>
          <PlanCards families={shown} fits={fits} parcel={parcel} />
        </>
      )}
    </>
  );
}
