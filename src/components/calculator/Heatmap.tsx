"use client";

import { useMemo } from "react";
import type { DealInputs } from "@/lib/feasibility/model";
import { sensitivityGrid } from "@/lib/feasibility/analysis";

export const toneOf = (m: number | null): "good" | "ok" | "bad" => (m == null ? "bad" : m >= 15 ? "good" : m >= 8 ? "ok" : "bad");
export const TONE_VAR = { good: "var(--green)", ok: "var(--amber)", bad: "var(--red)" } as const;
export const TONE_TINT = { good: "var(--green-tint)", ok: "var(--amber-tint)", bad: "var(--red-tint)" } as const;

export default function Heatmap({ inputs, valueWord }: { inputs: DealInputs; valueWord: string }) {
  const g = useMemo(() => sensitivityGrid(inputs), [inputs]);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1.5 text-sm tabular-nums">
          <caption className="sr-only">Margin on cost for changes in build cost and {valueWord}</caption>
          <thead>
            <tr>
              <th scope="col" className="p-1 text-left text-xs font-semibold" style={{ color: "var(--slate)" }}>Build cost ↓ / {valueWord} →</th>
              {g.valueSteps.map((v) => (
                <th key={v} scope="col" className="p-1 text-center text-xs font-semibold" style={{ color: "var(--slate)" }}>{v > 0 ? `+${v}` : v}%</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.hardSteps.map((h, ri) => (
              <tr key={h}>
                <th scope="row" className="p-1 text-left text-xs font-semibold" style={{ color: "var(--slate)" }}>{h > 0 ? `+${h}` : h}%</th>
                {g.margin[ri].map((m, ci) => {
                  const t = toneOf(m);
                  const base = h === 0 && g.valueSteps[ci] === 0;
                  return (
                    <td key={ci} className="rounded-lg p-2 text-center font-semibold" style={{ background: TONE_TINT[t], color: TONE_VAR[t], outline: base ? "2px solid var(--ink)" : undefined }}>
                      {m.toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>
        Margin on cost. Green clears 15%, amber is 8 to 15%, red is under 8%. The outlined cell is your base case.
      </p>
    </div>
  );
}
