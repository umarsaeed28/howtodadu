import type { DealResult } from "@/lib/feasibility/model";
import { usd } from "@/lib/format";

const PARTS = [
  { k: "acquisition", label: "Land", color: "#92B8A2" },
  { k: "hard", label: "Build", color: "var(--flag)" },
  { k: "soft", label: "Soft costs", color: "#CDB57B" },
  { k: "financing", label: "Financing and carry", color: "#B9573F" },
] as const;

/** Cost stack as a bar, with an optional value bar below it for scale. */
export default function CostStack({ result, value, valueLabel }: { result: DealResult; value?: number | null; valueLabel?: string }) {
  const c = result.costBreakdown;
  const max = Math.max(c.total, value ?? 0, 1);
  const parts = PARTS.map((p) => ({ ...p, v: c[p.k] })).filter((p) => p.v > 0);
  const gain = value != null ? value - c.total : null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="font-semibold" style={{ color: "var(--ink)" }}>What it costs</span>
          <span className="tabular-nums" style={{ color: "var(--ink)" }}>{usd(c.total)}</span>
        </div>
        <div className="flex h-9 overflow-hidden rounded-lg" style={{ width: `${(c.total / max) * 100}%` }} role="img" aria-label={`Cost ${usd(c.total)}`}>
          {parts.map((p) => (
            <span key={p.k} className="block h-full" style={{ width: `${(p.v / c.total) * 100}%`, background: p.color }} title={`${p.label} ${usd(p.v)}`} />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--slate)" }}>
          {parts.map((p) => (
            <li key={p.k} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
              {p.label} <span className="tabular-nums" style={{ color: "var(--ink)" }}>{usd(p.v)}</span>
            </li>
          ))}
        </ul>
      </div>
      {value != null && gain != null && (
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-semibold" style={{ color: "var(--ink)" }}>{valueLabel}</span>
            <span className="tabular-nums" style={{ color: "var(--ink)" }}>{usd(value)}</span>
          </div>
          <div className="h-9 rounded-lg" style={{ width: `${(value / max) * 100}%`, background: gain >= 0 ? "var(--green)" : "var(--red)", opacity: 0.9 }} />
          <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: gain >= 0 ? "var(--green)" : "var(--red)" }}>
            {gain >= 0 ? "Left over: " : "Short by: "}{usd(Math.abs(gain))}
          </p>
        </div>
      )}
    </div>
  );
}
