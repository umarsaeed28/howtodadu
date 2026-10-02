"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_FORM,
  fromSearchParams,
  parseForm,
  toSearchParams,
  type CalcForm,
} from "@/lib/calculator/inputs";
import { COST_LABEL } from "@/lib/config/costs";
import { maxOffer, TARGET_MARGIN_PCT } from "@/lib/feasibility/analysis";
import { usd, pct } from "@/lib/format";
import Field from "./Field";
import CostStack from "./CostStack";
import Proforma from "./Proforma";
import { REHAB_LABELS, REHAB_RATES, type RehabLevel } from "@/lib/dadu-value";
import Heatmap, { TONE_TINT, TONE_VAR, toneOf } from "./Heatmap";
import { RentCard } from "./ExitCompare";

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="pa-raised p-5">
      <h2 className="pa-display text-base" style={{ color: "var(--ink)" }}>{title}</h2>
      {note && <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>{note}</p>}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: keyof typeof TONE_VAR }) {
  return (
    <div className="pa-inset px-4 py-3">
      <p className="text-xs font-semibold" style={{ color: "var(--slate)" }}>{label}</p>
      <p className="pa-display mt-1 text-xl tabular-nums sm:text-2xl" style={{ color: tone ? TONE_VAR[tone] : "var(--ink)" }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--slate)" }}>{sub}</p>}
    </div>
  );
}

export default function CalculatorClient() {
  const sp = useSearchParams();
  const address = sp.get("addr");
  const [form, setForm] = useState<CalcForm>(() => fromSearchParams(new URLSearchParams(sp.toString())));

  // Mirror the inputs into the URL so a result can be shared.
  useEffect(() => {
    const q = toSearchParams(form, address ? { addr: address } : {}).toString();
    const next = `${window.location.pathname}${q ? `?${q}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [form, address]);

  const set = (k: keyof CalcForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const parsed = useMemo(() => parseForm(form), [form]);
  const err = (k: keyof CalcForm) => parsed.errors.find((e) => e.field === k)?.message;

  const headline = parsed.sale ?? parsed.rent;
  const headlineIsSale = parsed.sale !== null;
  const margin = headline
    ? headlineIsSale
      ? headline.result.exits.sell?.marginOnCost ?? headline.result.marginOnCost
      : headline.result.marginOnCost
    : null;
  const tone = margin == null ? null : toneOf(margin);
  const gain = headline
    ? headlineIsSale
      ? headline.result.exits.sell?.profit ?? headline.result.profit
      : headline.result.exits.hold?.valueCreated ?? headline.result.profit
    : null;
  const offer = useMemo(() => (headline && parsed.hasPrice ? maxOffer(headline.inputs) : null), [headline, parsed.hasPrice]);
  const price = parseFloat(form.price.replace(/[$,\s]/g, "")) || 0;
  const cost = parsed.costOnly;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pa-display text-2xl sm:text-3xl" style={{ color: "var(--ink)" }}>Estimate your return</h1>
          <p className="mt-1 max-w-xl text-sm" style={{ color: "var(--slate)" }}>
            A full proforma: the house, the cottage, financing, holding costs and the exit. Team rules start filled in; market numbers are yours.
            {address ? <> Estimating for <strong style={{ color: "var(--ink)" }}>{address}</strong>.</> : null}
          </p>
        </div>
        <button type="button" className="pa-btn pa-btn-sm" onClick={() => setForm({ ...DEFAULT_FORM })}>
          <RotateCcw size={14} aria-hidden /> Reset
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <Group title="The house" note="Leave the price blank if you already own it and are only adding the DADU.">
            <Field label="Purchase price" value={form.price} onChange={set("price")} prefix="$" error={err("price")} />
            <Field label="Closing costs" value={form.closingPct} onChange={set("closingPct")} suffix="%" error={err("closingPct")} />
            <Field label="House area" value={form.houseSqft} onChange={set("houseSqft")} suffix="sf" hint="Living area of the existing house" error={err("houseSqft")} />
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-semibold" style={{ color: "var(--ink)" }}>Rehab of the house</p>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rehab level">
                {(["none", "light", "moderate", "heavy"] as RehabLevel[]).map((l) => (
                  <button key={l} type="button" aria-pressed={form.rehabLevel === l} onClick={() => setForm((f) => ({ ...f, rehabLevel: l }))} className={`pa-chip ${form.rehabLevel === l ? "pa-chip-active" : ""}`} style={{ minHeight: 36 }}>
                    {REHAB_LABELS[l]}{l !== "none" && <span className="ml-1 text-[11px] opacity-70">${REHAB_RATES[l]}/sf</span>}
                  </button>
                ))}
                <button type="button" aria-pressed={form.rehabLevel === "custom"} onClick={() => setForm((f) => ({ ...f, rehabLevel: "custom" }))} className={`pa-chip ${form.rehabLevel === "custom" ? "pa-chip-active" : ""}`} style={{ minHeight: 36 }}>Custom</button>
                {form.rehabLevel === "custom" && <Field label="" value={form.rehabPerSf} onChange={set("rehabPerSf")} prefix="$" suffix="per sf" width={160} error={err("rehabPerSf")} />}
              </div>
              {parsed.rehab.cost > 0 && <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--slate)" }}>{parsed.rehab.houseSqft.toLocaleString("en-US")} sf × {usd(parsed.rehab.rate)} = {usd(parsed.rehab.cost)}</p>}
            </div>
            <Field label="House ARV" value={form.houseArv} onChange={set("houseArv")} prefix="$" placeholder={parsed.autoSaleParts && !parsed.autoSaleParts.houseIsOwn && parsed.autoSaleParts.house > 0 ? Math.round(parsed.autoSaleParts.house).toLocaleString("en-US") : undefined} hint="What the house is worth after the rehab. Blank means break-even: price plus rehab." error={err("houseArv")} />
          </Group>

          <Group title="The DADU" note="The report fills in the area from the lot's design. $50,000 soft costs is the team's rule; change it if you know better.">
            <Field label="DADU area" value={form.sf} onChange={set("sf")} suffix="sf" placeholder="1,000" error={err("sf")} />
            <Field label="Build cost" value={form.costPerSf} onChange={set("costPerSf")} prefix="$" suffix="per sf" error={err("costPerSf")} />
            <Field label="Soft costs" value={form.softFlat} onChange={set("softFlat")} prefix="$" hint="Design, permits, fees, utilities" error={err("softFlat")} />
            <Field label="Site work" value={form.siteWork} onChange={set("siteWork")} prefix="$" error={err("siteWork")} />
            <Field label="Extra permits and fees" value={form.permits} onChange={set("permits")} prefix="$" error={err("permits")} />
            <Field label="Contingency" value={form.contingencyPct} onChange={set("contingencyPct")} suffix="% of build" error={err("contingencyPct")} />
          </Group>

          <Group title="Financing and holding" note="Loan amount wins over loan to cost. Blank loan means all cash. Holding costs run for the whole timeline.">
            <Field label="Loan amount" value={form.loanAmount} onChange={set("loanAmount")} prefix="$" error={err("loanAmount")} />
            <Field label="Or loan to cost" value={form.ltcPct} onChange={set("ltcPct")} suffix="%" error={err("ltcPct")} />
            <Field label="Interest rate" value={form.ratePct} onChange={set("ratePct")} suffix="%" error={err("ratePct")} />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Permits" value={form.permitMonths} onChange={set("permitMonths")} suffix="mo" inputMode="numeric" error={err("permitMonths")} />
              <Field label="Build" value={form.buildMonths} onChange={set("buildMonths")} suffix="mo" inputMode="numeric" error={err("buildMonths")} />
              <Field label="Sale" value={form.exitMonths} onChange={set("exitMonths")} suffix="mo" inputMode="numeric" error={err("exitMonths")} />
            </div>
            <Field label="Property tax" value={form.taxMonthly} onChange={set("taxMonthly")} prefix="$" suffix="a month" error={err("taxMonthly")} />
            <Field label="Insurance" value={form.insuranceMonthly} onChange={set("insuranceMonthly")} prefix="$" suffix="a month" error={err("insuranceMonthly")} />
            <Field label="Utilities and upkeep" value={form.utilitiesMonthly} onChange={set("utilitiesMonthly")} prefix="$" suffix="a month" error={err("utilitiesMonthly")} />
          </Group>

          <Group title="The exit" note="The sale price starts at the house ARV (or break-even) plus what the DADU sells for. Type your own to override.">
            <Field label="Sale price (ARV)" value={form.salePrice} onChange={set("salePrice")} prefix="$" placeholder={parsed.autoSalePrice ? Math.round(parsed.autoSalePrice).toLocaleString("en-US") : undefined} hint={parsed.autoSaleParts && !form.salePrice ? `House ${usd(parsed.autoSaleParts.house)} + DADU ${usd(parsed.autoSaleParts.dadu)}` : undefined} error={err("salePrice")} />
            <div>
              <p className="mb-1 text-xs font-semibold" style={{ color: "var(--ink)" }}>Selling costs</p>
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink)", minHeight: 44 }}>
                <input type="checkbox" checked={form.sellSix === "1"} onChange={(e) => setForm((f) => ({ ...f, sellSix: e.target.checked ? "1" : "" }))} className="h-4 w-4 accent-[var(--green)]" />
                Standard 6% (agent fees and closing)
              </label>
              {form.sellSix !== "1" && <Field label="" value={form.sellingPct} onChange={set("sellingPct")} suffix="%" placeholder="0" error={err("sellingPct")} />}
            </div>
            <details className="sm:col-span-2">
              <summary className="cursor-pointer text-xs font-semibold" style={{ color: "var(--ink)" }}>Or hold and rent it</summary>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Monthly rent" value={form.rent} onChange={set("rent")} prefix="$" error={err("rent")} />
                <Field label="Cap rate" value={form.capPct} onChange={set("capPct")} suffix="%" hint="Needed with rent" error={err("capPct")} />
                <Field label="Vacancy" value={form.vacancyPct} onChange={set("vacancyPct")} suffix="%" error={err("vacancyPct")} />
                <Field label="Operating costs" value={form.opexPct} onChange={set("opexPct")} suffix="% of rent" error={err("opexPct")} />
                <Field label="Refinance loan to value" value={form.permLtvPct} onChange={set("permLtvPct")} suffix="%" error={err("permLtvPct")} />
                <Field label="Refinance rate" value={form.permRatePct} onChange={set("permRatePct")} suffix="%" error={err("permRatePct")} />
                <Field label="Amortization" value={form.permYears} onChange={set("permYears")} suffix="years" inputMode="numeric" error={err("permYears")} />
                <Field label="Minimum debt coverage" value={form.minDscr} onChange={set("minDscr")} suffix="x" error={err("minDscr")} />
              </div>
            </details>
          </Group>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-24" aria-live="polite">
          <section className="pa-raised p-5" aria-label="Construction estimate">
            <p className="text-xs font-semibold" style={{ color: "var(--slate)" }}>{COST_LABEL}</p>
            {parsed.ready ? (
              <>
                <p className="pa-display mt-1 text-3xl tabular-nums sm:text-4xl" style={{ color: "var(--ink)" }}>{usd(parsed.construction)}</p>
                <p className="mt-1 text-sm tabular-nums" style={{ color: "var(--slate)" }}>
                  {parsed.sf.toLocaleString("en-US")} sf × {usd(parsed.costPerSf)} per sf
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm" style={{ color: parsed.errors.length ? "var(--red)" : "var(--slate)" }}>
                {parsed.errors.length ? "Fix the highlighted fields to see results." : "Enter the DADU area to see what it costs to build."}
              </p>
            )}
          </section>

          {parsed.ready && cost && (
            <>
              <section className="pa-raised p-5" aria-label="Project cost">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Stat label="Total project cost" value={usd(cost.costBreakdown.total)} sub={`${cost.timelineMonths} months`} />
                  <Stat label="Cash you put in" value={usd(cost.equityRequired)} />
                  <Stat label="Borrowed" value={usd(cost.loanAmount)} />
                </div>
                <div className="mt-5">
                  <CostStack
                    result={headline?.result ?? cost}
                    value={headline ? (headlineIsSale ? headline.result.exits.sell?.netRevenue ?? null : headline.result.exits.hold?.stabilizedValue ?? null) : null}
                    valueLabel={headlineIsSale ? "What it sells for, after selling costs" : "What it is worth stabilized"}
                  />
                </div>
              </section>

              {!headline && (
                <section className="pa-inset p-5 text-sm" style={{ color: "var(--ink)" }} role="status">
                  Add a purchase price (or a sale price) to see the proforma and profit.
                </section>
              )}

              {headline && gain != null && margin != null && tone && (
                <section className="rounded-[14px] p-5" style={{ background: "var(--dusk)" }} aria-label="Result">
                  <span className="rounded-md px-3 py-1 text-sm font-bold" style={{ background: TONE_TINT[tone], color: TONE_VAR[tone] }}>
                    {tone === "good" ? "Pencils" : tone === "ok" ? "Tight" : "Does not pencil"}
                  </span>
                  <p className="pa-display mt-3 text-4xl tabular-nums" style={{ color: tone === "bad" ? "var(--red)" : "var(--ink)" }}>
                    {gain >= 0 ? "+" : "-"}{usd(Math.abs(gain))}
                  </p>
                  <p className="text-sm" style={{ color: "var(--ink)" }}>
                    {headlineIsSale ? "profit after selling costs" : "equity created once rented and stabilized"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <Stat label="Margin on cost" value={pct(margin)} tone={tone} sub={`Target ${TARGET_MARGIN_PCT}% or more`} />
                    <Stat label="Equity multiple" value={headline.result.equityMultiple != null ? `${headline.result.equityMultiple.toFixed(2)}x` : "n/a"} sub={headline.result.annualizedReturn != null ? `${pct(headline.result.annualizedReturn)} a year` : undefined} />
                    <Stat
                      label="Breakeven cushion"
                      value={`${headline.result.breakeven.cushionPct.toFixed(0)}%`}
                      sub="How far value can fall before you lose money"
                      tone={headline.result.breakeven.cushionPct >= 15 ? "good" : headline.result.breakeven.cushionPct >= 8 ? "ok" : "bad"}
                    />
                    {parsed.hasPrice && (
                      <Stat
                        label="Most you can pay"
                        value={offer != null ? usd(offer) : "No price works"}
                        sub={offer != null ? `${offer >= price ? `${usd(offer - price)} of room` : `${usd(price - offer)} over`} at ${TARGET_MARGIN_PCT}%` : `Even free land misses ${TARGET_MARGIN_PCT}%`}
                        tone={offer != null ? (offer >= price ? "good" : "bad") : "bad"}
                      />
                    )}
                  </div>
                </section>
              )}

              {parsed.sale && (
                <Proforma inputs={parsed.sale.inputs} result={parsed.sale.result} rehabCost={parsed.rehab.cost} soft={{ flat: parseFloat(form.softFlat.replace(/[$,\s]/g, "")) || 0, permits: parseFloat(form.permits.replace(/[$,\s]/g, "")) || 0, pct: parseFloat(form.softPct) || 0 }} sellingPct={parsed.sellingPct} />
              )}
              {parsed.rent && <RentCard r={parsed.rent.result} />}

              {headline && (
                <section className="pa-inset p-5" aria-label="Sensitivity">
                  <h3 className="pa-display mb-3 text-base" style={{ color: "var(--ink)" }}>What if costs or prices move</h3>
                  <Heatmap inputs={headline.inputs} valueWord={headlineIsSale ? "sale price" : "rent value"} />
                </section>
              )}
            </>
          )}

          <p className="text-xs" style={{ color: "var(--slate)" }}>
            Estimates only, not a quote or financial advice. Back to the{" "}
            <Link href="/" className="underline underline-offset-2">map</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
