"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { computeYield } from "@/lib/investor";
import { DEFAULT_FORM, toSearchParams } from "@/lib/calculator/inputs";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const num = (s: string): number | null => {
  const t = s.replace(/[$,\s%]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * The part of the investor view that needs assumptions. Every box starts blank: the app has no rent comps yet,
 * so it never shows a yield the investor did not set up.
 */
export default function InvestorSnapshot({ price, daduSqft, buildCost, address }: { price: number; daduSqft: number; buildCost: number; address: string }) {
  const [rent, setRent] = useState("");
  const [vac, setVac] = useState("");
  const [opex, setOpex] = useState("");
  const [cap, setCap] = useState("");
  const rentN = num(rent);
  const y = useMemo(() => (rentN && rentN > 0 && buildCost > 0 ? computeYield({ rentMonthly: rentN, vacancyPct: num(vac), opexPct: num(opex), capPct: num(cap), buildCost }) : null), [rentN, vac, opex, cap, buildCost]);

  const href = `/calculator?${toSearchParams({ ...DEFAULT_FORM, sf: String(Math.round(daduSqft)), price: String(price), rent: rent.replace(/[^\d.]/g, ""), vacancyPct: vac.replace(/[^\d.]/g, ""), opexPct: opex.replace(/[^\d.]/g, ""), capPct: cap.replace(/[^\d.]/g, "") }, { addr: address })}`;
  const field = (id: string, label: string, v: string, set: (s: string) => void, hint: string) => (
    <div>
      <label htmlFor={id} className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{label}</label>
      <input id={id} inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} placeholder={hint} className="mt-1 w-full px-3 py-2 text-sm tabular-nums" autoComplete="off" />
    </div>
  );

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--slate)" }}>Enter the rent you expect for the DADU. The app has no rent comps yet, so nothing is filled in for you.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {field("inv-rent", "DADU rent per month", rent, setRent, "e.g. 2,800")}
        {field("inv-vac", "Vacancy, %", vac, setVac, "optional")}
        {field("inv-opex", "Operating costs, %", opex, setOpex, "optional")}
        {field("inv-cap", "Cap rate, %", cap, setCap, "optional")}
      </div>
      <div className="mt-4" aria-live="polite">
        {!y ? (
          <p className="text-sm" style={{ color: "var(--slate)" }}>{buildCost > 0 ? "Add a monthly rent to see yield on the build cost." : "This lot has no DADU size from the engine, so there is no build cost to measure against."}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {[
              ["Net income per year", usd(y.noi)],
              ["Yield on build cost", y.yieldOnBuild != null ? `${(y.yieldOnBuild * 100).toFixed(1)}%` : "n/a"],
              ["Payback", y.paybackYears != null ? `${y.paybackYears.toFixed(1)} years` : "n/a"],
              ["Value added at your cap rate", y.impliedValue != null ? usd(y.impliedValue) : "Enter a cap rate"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs" style={{ color: "var(--slate)" }}>{k}</dt>
                <dd className="pa-display text-xl tabular-nums" style={{ color: "var(--ink)" }}>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {y && y.ignored.length > 0 && <p className="mt-2 text-xs" style={{ color: "var(--slate)" }}>This ignores {y.ignored.join(" and ")} because you left {y.ignored.length === 1 ? "it" : "them"} blank, so it overstates the income.</p>}
        {y?.valueMinusBuild != null && <p className="mt-2 text-sm tabular-nums" style={{ color: "var(--ink)" }}>Value added minus build cost: <strong>{usd(y.valueMinusBuild)}</strong></p>}
      </div>
      <Link href={href} className="pa-btn mt-4 no-underline">Open the full underwriting <ArrowRight size={15} aria-hidden /></Link>
    </div>
  );
}
