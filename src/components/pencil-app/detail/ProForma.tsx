"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import { usd, pct } from "@/lib/format";

export default function ProForma({ parcel }: { parcel: Parcel }) {
  const [open, setOpen] = useState(true);

  const land = parcel.listPrice;
  const rest = Math.max(parcel.allInCost - land, 0);
  const hard = Math.round(rest * 0.7);
  const soft = Math.round(rest * 0.2);
  const financing = rest - hard - soft;
  const revenue = parcel.projectedValue;
  const profit = revenue - parcel.allInCost;

  const rows: { label: string; value: number; muted?: boolean }[] = [
    { label: "Land (list price)", value: land },
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
              <td className="pa-mono px-4 py-2.5 text-right font-medium">{usd(parcel.allInCost)}</td>
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
                {usd(profit)} · {pct(parcel.marginPct)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
