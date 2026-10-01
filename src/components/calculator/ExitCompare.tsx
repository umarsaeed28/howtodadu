import type { DealResult } from "@/lib/feasibility/model";
import { usd, pct } from "@/lib/format";
import { TONE_VAR } from "./Heatmap";

type Tone = keyof typeof TONE_VAR;

function Row({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: Tone }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{ color: "var(--slate)" }}>{k}</dt>
      <dd className={`text-right tabular-nums ${strong ? "font-bold" : "font-medium"}`} style={{ color: tone ? TONE_VAR[tone] : "var(--ink)" }}>{v}</dd>
    </div>
  );
}

export function SaleCard({ r }: { r: DealResult }) {
  const s = r.exits.sell;
  if (!s) return null;
  return (
    <div className="pa-inset p-4">
      <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>If you sell it</h4>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row k="Sale price" v={usd(s.grossRevenue)} />
        <Row k="After selling costs" v={usd(s.netRevenue)} />
        <Row k="Profit" v={usd(s.profit)} strong tone={s.profit >= 0 ? "good" : "bad"} />
        <Row k="Margin on cost" v={pct(s.marginOnCost)} />
        {r.annualizedReturn != null && <Row k="Annualized return" v={pct(r.annualizedReturn)} />}
      </dl>
    </div>
  );
}

export function RentCard({ r }: { r: DealResult }) {
  const h = r.exits.hold;
  if (!h) return null;
  return (
    <div className="pa-inset p-4">
      <h4 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>If you rent it and refinance</h4>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row k="Net income per year" v={usd(h.noi)} />
        <Row k="Worth once stabilized" v={usd(h.stabilizedValue)} />
        <Row k="Value created over cost" v={usd(h.valueCreated)} strong tone={h.valueCreated >= 0 ? "good" : "bad"} />
        <Row k="Yield on cost" v={`${h.yieldOnCost.toFixed(1)}% (${h.spreadToCapPts >= 0 ? "+" : ""}${h.spreadToCapPts.toFixed(1)} pts vs cap)`} tone={h.spreadToCapPts >= 1 ? "good" : h.spreadToCapPts >= 0 ? "ok" : "bad"} />
        <Row k="Debt coverage" v={`${h.dscr.toFixed(2)}x`} tone={h.dscr >= 1.25 ? "good" : "bad"} />
        <Row k={h.refiCashOut >= 0 ? "Cash back at refinance" : "Cash still owed at refinance"} v={usd(Math.abs(h.refiCashOut))} tone={h.refiCashOut >= 0 ? "good" : "ok"} />
        <Row k="Cash-on-cash" v={h.cashOnCashPct != null ? `${h.cashOnCashPct}%` : "All cash returned"} />
      </dl>
    </div>
  );
}
