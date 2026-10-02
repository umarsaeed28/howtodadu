"use client";

import { REHAB_LABELS, REHAB_RATES, type RehabLevel } from "@/lib/dadu-value";

const LEVELS: RehabLevel[] = ["none", "light", "moderate", "heavy"];

/** Pick how much work the existing house needs; the rate per sf of house goes into the all-in cost. */
export default function RehabPicker({ value, onChange, houseSqft }: { value: RehabLevel; onChange: (v: RehabLevel) => void; houseSqft: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Existing house rehab">
      <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>Existing house{houseSqft ? ` (${Math.round(houseSqft).toLocaleString()} sf)` : ""}:</span>
      {LEVELS.map((l) => (
        <button key={l} type="button" aria-pressed={value === l} onClick={() => onChange(l)} className={`pa-chip ${value === l ? "pa-chip-active" : ""}`} style={{ minHeight: 32 }} title={l === "none" ? "No work on the house" : `$${REHAB_RATES[l]} per sf of house`}>
          {REHAB_LABELS[l]}{l !== "none" && <span className="ml-1 text-[11px] opacity-70">${REHAB_RATES[l]}/sf</span>}
        </button>
      ))}
      {!houseSqft && value !== "none" && <span className="text-xs" style={{ color: "var(--amber)" }}>House size unknown, so no rehab cost is added.</span>}
    </div>
  );
}
