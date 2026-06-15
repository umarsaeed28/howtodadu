"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import type { DealResult } from "@/lib/feasibility/model";
import { usd, pct } from "@/lib/format";

export default function ProForma({
  parcel,
  result,
}: {
  parcel: Parcel;
  /** Live underwriting result. When present, every row comes from it. */
  result?: DealResult;
}) {
  const [open, setOpen] = useState(true);

  let acquisition: number, hard: number, soft: number, financing: number;
  let total: number, revenue: number, profit: number, margin: number;

  if (result) {
    acquisition = result.costBreakdown.acquisition;
    hard = result.costBreakdown.hard;
    soft = result.costBreakdown.soft;
    financing = result.costBreakdown.financing;
    total = result.costBreakdown.total;
    revenue = result.grossRevenue;
    profit = result.profit;
    margin = result.marginOnCost;
  } else {
    acquisition = parcel.listPrice;
    const rest = Math.max(parcel.allInCost - acquisition, 0);
    hard = Math.round(rest * 0.7);
    soft = Math.round(rest * 0.2);
    financing = rest - hard - soft;
    total = parcel.allInCost;
    revenue = parcel.projectedValue;
    profit = revenue - parcel.allInCost;
    margin = parcel.marginPct;
  }

  const rows: { label: string; value: number; muted?: boolean }[] = [
    { label: result ? "Acquisition" : "Land (list price)", value: acquisition },
    { label: "Hard costs", value: hard },
    { label: "Soft costs", value: soft },
    { label: "Financing", value: financing },
  ];

  return (
    <section className="pa-card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <h2 className="pa-display text-base">Pro forma</h2>
        <ChevronDown
          size={18}
          aria-hidden
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
        />
      </button>
      {open && (
        <table className="w-full border-t text-sm" style={{ borderColor: "var(--hairline)" }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b" style={{ borderColor: "var(--hairline)" }}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal" style={{ color: "var(--slate)" }}>
                  {r.label}
                </th>
                <td className="pa-mono px-4 py-2.5 text-right">{usd(r.value)}</td>
              </tr>
            ))}
            <tr className="border-b" style={{ borderColor: "var(--hairline)", background: "var(--paper)" }}>
              <th scope="row" className="px-4 py-2.5 text-left font-medium">
                Total cost
              </th>
              <td className="pa-mono px-4 py-2.5 text-right font-medium">{usd(total)}</td>
            </tr>
            <tr className="border-b" style={{ borderColor: "var(--hairline)" }}>
              <th scope="row" className="px-4 py-2.5 text-left font-normal" style={{ color: "var(--slate)" }}>
                Projected revenue
              </th>
              <td className="pa-mono px-4 py-2.5 text-right">{usd(revenue)}</td>
            </tr>
            <tr style={{ background: "var(--green-tint)" }}>
              <th scope="row" className="px-4 py-3 text-left font-medium" style={{ color: "var(--green)" }}>
                Profit · margin
              </th>
              <td className="pa-mono px-4 py-3 text-right font-medium" style={{ color: "var(--green)" }}>
                {usd(profit)} · {pct(margin)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
