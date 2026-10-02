"use client";

import { useState } from "react";
import RehabPicker from "./RehabPicker";
import { REHAB_LABELS, daduEconomics, type RehabLevel } from "@/lib/dadu-value";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** ROI, resale value and the all-in cost for the DADU, with a rehab picker for the existing house. */
export default function InvestorRoi({ daduSqft, houseSqft, listPrice }: { daduSqft: number | null; houseSqft: number | null; listPrice: number }) {
  const [rehab, setRehab] = useState<RehabLevel>("none");
  const e = daduEconomics(daduSqft, undefined, { rehab, houseSqft });
  if (!e) return null;
  const tiles: [string, string, string, string?][] = [
    ["DADU ROI", `${Math.round(e.roi * 100)}%`, `${usd(e.profit)} profit on ${usd(e.allInCost)} all in`, e.profit >= 0 ? "#145A40" : "var(--red)"],
    ["DADU resale value", usd(e.saleValue), `${e.sf.toLocaleString()} sf × ${usd(e.salePsf)} per sf`],
    ...(e.rehabCost > 0 ? [[`${REHAB_LABELS[e.rehab]} of the house`, usd(e.rehabCost), `${Math.round(houseSqft ?? 0).toLocaleString()} sf × $${e.rehabRate} per sf`] as [string, string, string]] : []),
    [e.rehabCost > 0 ? "Price, rehab and DADU" : "Price plus DADU", usd(listPrice + e.buildCost + e.rehabCost), `${usd(listPrice)} + ${usd(e.buildCost)} build${e.rehabCost > 0 ? ` + ${usd(e.rehabCost)} rehab` : ""}`],
  ];
  return (
    <div>
      <RehabPicker value={rehab} onChange={setRehab} houseSqft={houseSqft} />
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([k, v, note, color]) => (
          <div key={k} className="pa-raised p-4">
            <dt className="text-xs" style={{ color: "var(--slate)" }}>{k}</dt>
            <dd className="pa-display mt-1 text-xl tabular-nums" style={{ color: color ?? "var(--ink)" }}>{v}</dd>
            <dd className="mt-0.5 text-xs" style={{ color: "var(--slate)" }}>{note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
