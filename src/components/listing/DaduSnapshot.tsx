import { Check, HelpCircle, X } from "lucide-react";
import type { SiteScore } from "@/lib/dadu-score";
import { daduEconomics } from "@/lib/dadu-value";

const GRADE_COLOR = ["#8A8574", "#9A6F12", "#2E7D55", "#145A40"];
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Score ring, the five factors as bars, the three numbers that matter, and the screening gates as pass/check/fail marks. */
export default function DaduSnapshot({ site, daduSqft, buildCost, layoutLabel }: { site: SiteScore; daduSqft: number; buildCost: number | null; layoutLabel: string | null }) {
  const color = site.eligible ? GRADE_COLOR[site.tier] : "var(--red)";
  const econ = daduEconomics(daduSqft);
  const r = 34;
  const c = 2 * Math.PI * r;
  const gates = site.gates.filter((g) => g.key !== "zoning" || g.status !== "pass");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <svg width={84} height={84} viewBox="0 0 84 84" role="img" aria-label={`Site score ${site.score} out of 100, ${site.grade}`} className="shrink-0">
          <circle cx={42} cy={42} r={r} fill="none" stroke="var(--green-tint)" strokeWidth={8} />
          <circle cx={42} cy={42} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${(c * site.score) / 100} ${c}`} transform="rotate(-90 42 42)" />
          <text x={42} y={43} textAnchor="middle" dominantBaseline="central" className="pa-display tabular-nums" fontSize={26} fill="var(--ink)">{site.score}</text>
        </svg>
        <div className="min-w-0">
          <p className="pa-display text-2xl leading-tight" style={{ color }}>{site.eligible ? site.grade : "Not eligible"}</p>
          <p className="text-sm" style={{ color: "var(--slate)" }}>{site.eligible ? "DADU site score out of 100" : "A screening rule rules this lot out"}</p>
        </div>
      </div>

      {site.eligible && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {([
            [daduSqft ? `${daduSqft.toLocaleString()} sf` : "n/a", "largest cottage"],
            [econ ? `${Math.round(econ.roi * 100)}% ROI` : buildCost ? usd(buildCost) : "n/a", econ ? `${usd(econ.profit)} profit` : "to build, about"],
            [layoutLabel ?? "n/a", "best layout"],
          ] as [string, string][]).map(([v, k]) => (
            <div key={k} className="rounded-xl px-2 py-3" style={{ background: "var(--paper)" }}>
              <dd className="pa-display text-base leading-tight tabular-nums sm:text-lg" style={{ color: "var(--ink)" }}>{v}</dd>
              <dt className="mt-1 text-xs" style={{ color: "var(--slate)" }}>{k}</dt>
            </div>
          ))}
        </dl>
      )}

      {site.eligible && (
        <ul className="flex flex-col gap-2.5" aria-label="What the score is made of">
          {site.factors.map((f) => (
            <li key={f.key} title={f.note}>
              <div className="flex items-baseline justify-between text-sm">
                <span style={{ color: "var(--ink)" }}>{f.name}</span>
                <span className="tabular-nums text-xs font-semibold" style={{ color: "var(--slate)" }}>{f.score}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full" style={{ background: "var(--green-tint)" }}>
                <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: f.score >= 70 ? "var(--green)" : f.score >= 40 ? "#D9A441" : "var(--red)" }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ul className="flex flex-wrap gap-1.5" aria-label="Screening checks">
        {gates.map((g) => {
          const s = g.status === "pass" ? { bg: "var(--green-tint)", fg: "#145A40", Icon: Check, sr: "Passes" } : g.status === "fail" ? { bg: "var(--red-tint)", fg: "var(--red)", Icon: X, sr: "Fails" } : { bg: "var(--amber-tint)", fg: "var(--amber)", Icon: HelpCircle, sr: "Confirm" };
          return (
            <li key={g.key} title={g.note} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>
              <s.Icon size={12} strokeWidth={2.5} aria-hidden /><span className="sr-only">{s.sr}: </span>{g.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
