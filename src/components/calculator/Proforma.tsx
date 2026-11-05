import type { DealInputs, DealResult } from "@/lib/feasibility/model";
import { usd, pct } from "@/lib/format";

type Line = { k: string; v: number; sub?: boolean; strong?: boolean; tone?: "good" | "bad" | "muted"; note?: string };

function Row({ line }: { line: Line }) {
  const color = line.tone === "good" ? "var(--green-bright)" : line.tone === "bad" ? "var(--red)" : line.tone === "muted" ? "var(--slate)" : "var(--ink)";
  return (
    <div className={`flex items-baseline justify-between gap-3 ${line.sub ? "pl-4" : ""} ${line.strong ? "border-t pt-2" : ""}`} style={line.strong ? { borderColor: "var(--hairline)" } : undefined}>
      <dt className={line.strong ? "font-semibold" : ""} style={{ color: line.sub ? "var(--slate)" : "var(--ink)" }}>
        {line.k}
        {line.note && <span className="ml-1.5 text-[11px]" style={{ color: "var(--slate)" }}>{line.note}</span>}
      </dt>
      <dd className={`shrink-0 text-right tabular-nums ${line.strong ? "pa-display text-base" : ""}`} style={{ color }}>
        {line.v < 0 ? "−" : ""}{usd(Math.abs(line.v))}
      </dd>
    </div>
  );
}

/**
 * The proforma: every dollar in, every dollar out, in the order a lender reads it. Uses, sources, the exit, the return.
 */
export default function Proforma({ inputs, result, rehabCost, soft, sellingPct }: { inputs: DealInputs; result: DealResult; rehabCost: number; soft: { flat: number; permits: number; pct: number }; sellingPct: number }) {
  const c = result.costBreakdown;
  const a = inputs.acquisition;
  const closing = a.purchasePrice * (a.closingCostsPct / 100);
  const build = inputs.hard.buildableSqft * inputs.hard.costPerSqft;
  const contingency = (build + rehabCost) * (inputs.hard.contingencyPct / 100);
  const months = result.timelineMonths;
  const carry = (inputs.financing.propertyTaxMonthly + inputs.financing.utilitiesMaintMonthly) * months;
  const interest = c.financing - carry;
  const sell = result.exits.sell;
  const net = sell ? sell.netRevenue : null;
  const profit = sell ? sell.profit : null;

  const uses: Line[] = [
    { k: "Purchase price", v: a.purchasePrice },
    ...(closing > 0 ? [{ k: "Closing costs", v: closing, sub: true, note: `${a.closingCostsPct}%` }] : []),
    ...(a.demoSitePrep > 0 ? [{ k: "Site work and utilities", v: a.demoSitePrep, sub: true }] : []),
    ...(rehabCost > 0 ? [{ k: "Rehab of the house", v: rehabCost, note: `${inputs.hard.rehabSqft.toLocaleString("en-US")} sf × ${usd(inputs.hard.rehabCostPerSqft)}` }] : []),
    { k: "DADU construction", v: build, note: `${inputs.hard.buildableSqft.toLocaleString("en-US")} sf × ${usd(inputs.hard.costPerSqft)}` },
    ...(contingency > 0 ? [{ k: "Contingency", v: contingency, sub: true, note: `${inputs.hard.contingencyPct}%` }] : []),
    ...(c.soft > 0 ? [{ k: "Soft costs", v: c.soft, note: [soft.permits > 0 && `permits ${usd(soft.permits)}`, soft.pct > 0 && `${soft.pct}% of build`].filter(Boolean).join(" + ") || undefined }] : []),
    ...(interest > 0 ? [{ k: "Loan interest", v: interest, note: `${inputs.financing.interestRatePct}% over ${months} months` }] : []),
    ...(carry > 0 ? [{ k: "Holding costs", v: carry, note: `${usd(inputs.financing.propertyTaxMonthly + inputs.financing.utilitiesMaintMonthly)} a month × ${months}` }] : []),
    { k: "Total cost", v: c.total, strong: true },
  ];
  const sources: Line[] = [
    { k: "Loan", v: result.loanAmount, note: c.total > 0 ? `${Math.round((result.loanAmount / Math.max(1, c.total - c.financing)) * 100)}% of cost` : undefined },
    { k: "Your cash", v: result.equityRequired, strong: true },
  ];
  const exit: Line[] = sell
    ? [
        { k: "Sale price (ARV)", v: sell.grossRevenue },
        { k: "Selling costs", v: -(sell.grossRevenue - sell.netRevenue), sub: true, note: `${sellingPct}%` },
        { k: "Net proceeds", v: sell.netRevenue, strong: true },
      ]
    : [];

  return (
    <section className="pa-raised p-5" aria-label="Proforma">
      <h3 className="pa-display text-base" style={{ color: "var(--ink)" }}>Proforma</h3>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--slate)" }}>Uses</p>
          <dl className="space-y-1.5 text-sm">{uses.map((l) => <Row key={l.k} line={l} />)}</dl>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--slate)" }}>Sources</p>
            <dl className="space-y-1.5 text-sm">{sources.map((l) => <Row key={l.k} line={l} />)}</dl>
          </div>
          {exit.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--slate)" }}>Exit</p>
              <dl className="space-y-1.5 text-sm">{exit.map((l) => <Row key={l.k} line={l} />)}</dl>
            </div>
          )}
          {profit != null && net != null && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--slate)" }}>Return</p>
              <dl className="space-y-1.5 text-sm">
                <Row line={{ k: "Profit", v: profit, strong: true, tone: profit >= 0 ? "good" : "bad" }} />
                <div className="flex justify-between gap-3"><dt style={{ color: "var(--ink)" }}>Margin on cost</dt><dd className="tabular-nums" style={{ color: "var(--ink)" }}>{pct(sell!.marginOnCost)}</dd></div>
                <div className="flex justify-between gap-3"><dt style={{ color: "var(--ink)" }}>Return on your cash</dt><dd className="tabular-nums" style={{ color: "var(--ink)" }}>{result.equityRequired > 0 ? pct(result.returnOnEquity) : "n/a"}</dd></div>
                {result.annualizedReturn != null && <div className="flex justify-between gap-3"><dt style={{ color: "var(--ink)" }}>Annualized</dt><dd className="tabular-nums" style={{ color: "var(--ink)" }}>{pct(result.annualizedReturn)} over {months} months</dd></div>}
                {result.equityMultiple != null && <div className="flex justify-between gap-3"><dt style={{ color: "var(--ink)" }}>Equity multiple</dt><dd className="tabular-nums" style={{ color: "var(--ink)" }}>{result.equityMultiple.toFixed(2)}x</dd></div>}
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
