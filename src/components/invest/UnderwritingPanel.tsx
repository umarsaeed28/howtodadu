"use client";

import { useMemo, useRef, useState } from "react";
import { NUMBER_FIELDS, type InvestAssumptions, type NumberField } from "@/lib/invest/assumptions";
import { underwrite } from "@/lib/invest/underwriting";
import { track } from "@/lib/analytics";
import { usd } from "./format";

/** The sliders a visitor gets; the other assumptions show in the table, as Pencil sets them. */
const SLIDERS: NumberField["key"][] = ["buildCostPerSf", "downPaymentPct", "interestRatePct"];

const fmt = (f: NumberField, v: number) => (f.unit === "$" ? usd(v) : `${v}%`);

/**
 * Every cost assumption visible, the main ones adjustable, and cash required recomputed as you drag. Starts from
 * Pencil's defaults; nothing here is saved. Sale value comes later, from MLS comps.
 */
export default function UnderwritingPanel({ listingId, price, daduSqft, houseSqft, initial }: { listingId: string; price: number; daduSqft: number; houseSqft: number | null; initial: InvestAssumptions }) {
  const [a, setA] = useState<InvestAssumptions>(initial);
  const u = useMemo(() => underwrite({ price, daduSqft, houseSqft }, a), [a, price, daduSqft, houseSqft]);
  const edited = useRef(new Set<string>());

  const change = (k: keyof InvestAssumptions, v: number | boolean) => {
    if (!edited.current.has(k)) {
      edited.current.add(k);
      track("assumption_edited", { field: k });
    }
    setA((x) => ({ ...x, [k]: v }));
  };

  const rows: [string, string, string?][] = [
    ["Purchase price (list price)", usd(u.purchase)],
    [`Build cost (${u.daduSqft.toLocaleString("en-US")} sf × ${usd(a.buildCostPerSf)})`, usd(u.buildCost)],
    [`Soft costs (Pencil plan ${usd(a.planCost)} + permit ${usd(a.permitCost)} + city fees ${usd(a.cityFees)})`, usd(u.softCosts)],
    ["Total project cost", usd(u.totalProjectCost), "strong"],
    ...(u.allInPerSf ? ([["All-in cost per sf (house and DADU)", usd(u.allInPerSf)]] as [string, string][]) : []),
    [`Down payment (${a.downPaymentPct}% of purchase)`, usd(u.downPayment)],
    [a.financeConstruction ? "Build financed (construction loan)" : "Build paid in cash", usd(u.buildCost)],
    ...(a.financeConstruction ? ([[`A year of construction loan interest (${a.interestRatePct}%)`, usd(u.financingCost)]] as [string, string][]) : []),
    ["Cash required", usd(u.cashRequired), "strong"],
  ];

  return (
    <div className="iv-uw">
      <div className="iv-uw-big">
        <span><b>{usd(u.cashRequired)}</b><i>cash required</i></span>
        <span><b>{usd(u.totalProjectCost)}</b><i>total project cost</i></span>
        <span><b>{u.daduSqft.toLocaleString("en-US")} sf</b><i>DADU, the code maximum</i></span>
      </div>

      <div className="iv-sliders">
        {SLIDERS.map((k) => {
          const f = NUMBER_FIELDS.find((x) => x.key === k)!;
          const v = a[k] as number;
          const id = `uw-${listingId}-${k}`;
          return (
            <label key={k} htmlFor={id} className="iv-slider">
              <span className="iv-slider-top"><span>{f.label}</span><b>{fmt(f, v)}</b></span>
              <input id={id} type="range" min={f.min} max={f.max} step={f.step} value={v} onChange={(e) => change(k, Number(e.target.value))} disabled={k === "interestRatePct" && !a.financeConstruction} />
            </label>
          );
        })}
        <label className="iv-toggle">
          <input type="checkbox" checked={a.financeConstruction} onChange={(e) => change("financeConstruction", e.target.checked)} />
          Finance the build with a construction loan
        </label>
      </div>

      <table className="iv-table">
        <tbody>
          {rows.map(([k, v, strong]) => (
            <tr key={k} data-strong={strong ? "" : undefined}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="iv-note">Costs only. The DADU&apos;s sale value and the return on it will come from comparable sales once Pencil&apos;s MLS feed is connected.</p>
    </div>
  );
}
