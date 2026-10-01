import type { Adjustment, Analysis, Fact, Finding, Passage, Verdict } from "./types";

/** Numbers in a claim, normalised: "$1,000" and "1000" both become "1000". */
export function numbersIn(s: string): string[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.0+$/, ""));
}

const norm = (s: string) => s.replace(/,/g, "");

export interface ValidationResult {
  kept: Finding[];
  dropped: { claim: string; reason: string }[];
}

/**
 * Deterministic grounding check. A finding survives only if
 *  1. it cites at least one label, and every label exists, and
 *  2. every number in the claim appears in the text of a source it cites.
 * Everything else is dropped and reported as unavailable. The model never gets to vouch for itself.
 */
export function validateFindings(findings: Finding[], passages: Passage[], facts: Fact[]): ValidationResult {
  const sources = new Map<string, string>();
  for (const p of passages) sources.set(p.label, norm(p.text));
  for (const f of facts) sources.set(f.label, norm(f.text));
  const kept: Finding[] = [];
  const dropped: { claim: string; reason: string }[] = [];
  for (const f of findings) {
    const claim = (f.claim ?? "").trim();
    if (!claim) continue;
    const cites = (f.cites ?? []).map((c) => c.trim().toUpperCase());
    if (!cites.length) {
      dropped.push({ claim, reason: "no citation" });
      continue;
    }
    const unknown = cites.filter((c) => !sources.has(c));
    if (unknown.length) {
      dropped.push({ claim, reason: `unknown citation ${unknown.join(", ")}` });
      continue;
    }
    // Whole-number match: "8" must not pass because the source says "895".
    const known = new Set(numbersIn(cites.map((c) => sources.get(c)!).join(" ")));
    const missing = numbersIn(claim).filter((n) => !known.has(n));
    if (missing.length) {
      dropped.push({ claim, reason: `number ${missing[0]} is not in the cited sources` });
      continue;
    }
    kept.push({ claim, cites });
  }
  return { kept, dropped };
}

/**
 * Rules the model cannot override. Returns the verdict to publish and extra items to confirm.
 * - A candidate needs lot facts, and an HOA that is known to be absent. Otherwise it is unverified.
 * - If every finding was dropped, there is nothing to stand on: unverified.
 */
export function enforceVerdict(a: Analysis, ctx: { hasLot: boolean; hoaKnown: boolean; keptFindings: number }): { verdict: Verdict; extraConfirm: string[] } {
  const extra: string[] = [];
  let verdict = a.verdict;
  if (verdict === "candidate") {
    if (!ctx.hasLot) {
      verdict = "unverified";
      extra.push("This address is not in the city lot library, so its DADU size is unknown.");
    }
    if (!ctx.hoaKnown) {
      verdict = "unverified";
      extra.push("Confirm there is no HOA. The listing does not report one, and an HOA rules a property out.");
    }
  }
  if (!ctx.keptFindings) verdict = "unverified";
  return { verdict, extraConfirm: extra };
}

/** Most the AI may move the total score, either way. */
export const MAX_ADJUSTMENT = 15;

/**
 * Deterministic check on Claude's score changes. An adjustment survives only if it names a real factor, has a
 * whole-number delta, cites real labels, and every number in its reason appears in a source it cites (the same
 * grounding rule as findings). The total change is capped at ±15 and the score stays within 0 to 100.
 */
export function validateAdjustments(
  adjs: Adjustment[],
  passages: Passage[],
  facts: Fact[],
  factorNames: string[],
  baseline: number
): { kept: Adjustment[]; rejected: { factor: string; delta: number; reason: string }[]; score: number } {
  const names = new Map(factorNames.map((n) => [n.toLowerCase(), n]));
  const kept: Adjustment[] = [];
  const rejected: { factor: string; delta: number; reason: string }[] = [];
  for (const a of adjs ?? []) {
    const factor = names.get(String(a.factor ?? "").trim().toLowerCase());
    const delta = Number(a.delta);
    if (!factor) {
      rejected.push({ factor: String(a.factor), delta, reason: "unknown factor" });
      continue;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      rejected.push({ factor, delta, reason: "no change" });
      continue;
    }
    const check = validateFindings([{ claim: a.reason ?? "", cites: a.cites ?? [] }], passages, facts);
    if (!check.kept.length) {
      rejected.push({ factor, delta, reason: check.dropped[0]?.reason ?? "empty reason" });
      continue;
    }
    kept.push({ factor, delta: Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, Math.round(delta))), reason: check.kept[0].claim, cites: check.kept[0].cites });
  }
  const total = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, kept.reduce((s, a) => s + a.delta, 0)));
  return { kept, rejected, score: Math.max(0, Math.min(100, Math.round(baseline + total))) };
}
