export type Verdict = "PENCILS" | "TIGHT" | "NO";

/** Verdict from margin on cost (percent). Keeps pills and filters consistent. */
export function verdictFromMargin(marginPct: number): Verdict {
  if (marginPct >= 15) return "PENCILS";
  if (marginPct >= 8) return "TIGHT";
  return "NO";
}
