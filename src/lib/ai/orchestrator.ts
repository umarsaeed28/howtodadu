import type { RawListing } from "@/lib/listings";
import type { Candidate } from "@/lib/server/candidates";
import type { AduniverseFacts } from "@/lib/server/aduniverse";
import { ANALYZE_SCHEMA, ANALYZE_SYSTEM, EXTRACT_SCHEMA, EXTRACT_SYSTEM, HYDE_SYSTEM } from "./prompts";
import type { TierLlm } from "./llm";
import { AGENTS, type Tier, type TierConfig } from "./agents.config";
import { RunMeter } from "./usage";
import { enforceVerdict, validateAdjustments, validateFindings } from "./validate";
import type { Analysis, Assessment, Citation, Fact, Llm, Passage, ScoreDecision, TraceStep } from "./types";
import { GRADE_BANDS, gradeOf, type SiteScore } from "@/lib/dadu-score";

/**
 * The assessment chain. Autonomy level: semi-autonomous. The node order and every boundary are hardcoded;
 * the model plans the retrieval query (HyDE) and reasons over what was retrieved.
 *
 *   gate (code) -> facts (code) -> extract (LLM, small) -> hyde (LLM, small) -> retrieve (code)
 *     -> analyze (LLM, mid; large when the case is close) -> validate (code) -> decide score (code) -> render (code)
 *
 * Models, token caps and budgets come from src/lib/ai/agents.config.ts. Every LLM node is optional except analyze,
 * and analyze is skipped (rules-only score) when the run or the day is over budget.
 *
 * The rules baseline score (src/lib/dadu-score.ts) goes in as labelled facts. Claude decides the verdict and may move the
 * score with cited adjustments; code checks every adjustment and caps the total change at 15 points.
 *
 * Working memory is `RunState`: it lives for one run and carries each node's checked output to the next.
 */
export interface Deps {
  /** One model for every tier (tests, evals). */
  llm?: Llm;
  /** A model per tier (production; see llmFor in ./llm). Takes precedence over `llm`. */
  models?: Partial<Record<Tier, TierLlm | null>>;
  search: (question: string, opts: { k?: number; hyde?: string }) => Promise<Passage[]>;
  /** Counts tokens for this run. The caller wires it to the LLM clients' usage callbacks. */
  meter?: RunMeter;
  /** Tokens left in today's budget. 0 or less means rules-only. */
  dailyLeft?: number;
}

function pick(deps: Deps, tier: Tier): TierLlm | null {
  const m = deps.models?.[tier];
  if (m) return m;
  if (!deps.llm) return null;
  const cfg: TierConfig = AGENTS.tiers[tier];
  return { llm: deps.llm, model: cfg.fallback?.model ?? cfg.model };
}

/** Facts the city data cannot see, pulled from the listing text. Each one quotes the text, and the quote is checked. */
export interface Extracted {
  feature: "side_driveway" | "garage" | "alley_access" | "separate_entry" | "existing_adu" | "lower_unit" | "other";
  quote: string;
}
const FEATURE_TEXT: Record<Extracted["feature"], string> = {
  side_driveway: "a side driveway",
  garage: "a garage",
  alley_access: "alley access",
  separate_entry: "a separate entrance",
  existing_adu: "an existing ADU",
  lower_unit: "a lower unit with its own kitchen or living space",
  other: "a relevant lot feature",
};
const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
/** Guardrail: drop any extracted feature whose quote is not verbatim in the listing text. */
export function checkExtracted(items: Extracted[], description: string): Extracted[] {
  const d = norm(description);
  return (items ?? []).filter((x) => x && FEATURE_TEXT[x.feature] && x.quote && norm(x.quote).length >= 6 && d.includes(norm(x.quote))).slice(0, 5);
}

/** What the caller already knows about the lot, beyond the listing. */
export interface AssessContext {
  adu?: AduniverseFacts | null;
  /** Site-plan lines from the team guide rules. */
  planLines?: string[];
  /** The rules baseline. Without it Claude reads the listing but there is no score to decide. */
  site?: SiteScore | null;
}

interface RunState {
  trace: TraceStep[];
  models: Set<string>;
}

export const hoaExcluded = (l: Pick<RawListing, "hoaMonthly">): boolean => (l.hoaMonthly ?? 0) > 0;

async function step<T>(st: RunState, node: string, kind: TraceStep["kind"], fn: () => Promise<{ value: T; note: string; ok?: boolean }>): Promise<T> {
  const t0 = Date.now();
  try {
    const r = await fn();
    st.trace.push({ node, kind, ms: Date.now() - t0, ok: r.ok ?? true, note: r.note });
    return r.value;
  } catch (e) {
    st.trace.push({ node, kind, ms: Date.now() - t0, ok: false, note: e instanceof Error ? e.message.slice(0, 160) : "failed" });
    throw e;
  }
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Deterministic facts, each with a label the model can cite. */
export function buildFacts(l: RawListing, lot: Candidate | null, adu: AduniverseFacts | null = null, planLines: string[] = [], site: SiteScore | null = null): Fact[] {
  const rows: [string, string][] = [
    [`Address: ${l.address}`, "listing feed"],
    [`List price: ${usd(l.listPrice)}`, "listing feed"],
    [`Home: ${l.beds ?? "unknown"} beds, ${l.baths ?? "unknown"} baths, ${l.livingSqft ?? "unknown"} sf, built ${l.yearBuilt ?? "unknown"}`, "listing feed"],
    [`HOA: ${l.hoaMonthly == null ? "none reported by the listing" : l.hoaMonthly > 0 ? `${usd(l.hoaMonthly)} per month` : "none"}`, "listing feed"],
  ];
  if (lot) {
    rows.push(
      [`Lot: ${lot.lotSqft.toLocaleString("en-US")} sf, ${lot.lotType ?? "unknown"} lot, alley: ${lot.alley ? "yes" : "no"}, zoning ${lot.zoning}`, "city GIS"],
      [`Largest DADU the lot allows: ${lot.daduSqft ?? "none found"} sf. Site score ${lot.score} out of 100`, "city GIS"],
      lot.trees
        ? [`Trees: ${lot.trees.large} large (likely protected) and ${lot.trees.medium} medium trees reach the lot; canopy covers ${lot.trees.canopyPct}%. Largest open spot behind the house clear of medium and large trees: ${lot.trees.clearSqft.toLocaleString("en-US")} sf (a DADU needs at least 300 sf); ${lot.trees.clearSqftIfMediumRemoved.toLocaleString("en-US")} sf if medium trees were removed`, "2021 LiDAR tree crowns"]
        : [`Tree canopy ${lot.canopyPct == null ? "unknown" : Math.round(lot.canopyPct <= 1 ? lot.canopyPct * 100 : lot.canopyPct)}% (parcel figure, trees not measured one by one)`, "city GIS"],
      [`Steep slope: ${lot.steepPct ? "yes" : "none"}, ${lot.adusNearby} ADUs nearby`, "city GIS"]
    );
  } else {
    rows.push(["Lot: not in the city lot library (not an eligible single-family NR lot, or the DADU engine found no room)", "city GIS"]);
  }
  for (const line of adu?.lines ?? []) rows.push([line, `ADUniverse (${adu!.vintage} data)`]);
  for (const line of planLines) rows.push([line, "Site-plan rules (team guide)"]);
  if (site?.eligible) {
    rows.push([`Rules baseline score: ${site.score} out of 100 (${site.grade}), from the five weighted factors in the site-score guide`, "Site score rules"]);
    for (const f of site.factors) rows.push([`${f.name}: ${f.score} out of 100, weight ${f.weight}. ${f.note}`, "Site score rules"]);
  }
  return rows.map(([text, source], i) => ({ label: `F${i + 1}`, text, source }));
}

function render(a: { headline: string; findings: { claim: string; cites: string[] }[]; confirm: string[]; unavailable: string[] }): string {
  const lines = [a.headline, "", ...a.findings.map((f) => `- ${f.claim} [${f.cites.join(", ")}]`)];
  if (a.confirm.length) lines.push("", "To confirm:", ...a.confirm.map((c) => `- ${c}`));
  if (a.unavailable.length) lines.push("", "Data unavailable in retrieved sources:", ...a.unavailable.map((c) => `- ${c}`));
  return lines.join("\n");
}

const rulesOnly = (site: SiteScore | null | undefined): ScoreDecision | null =>
  site?.eligible ? { baselineScore: site.score, score: site.score, tier: site.tier, grade: site.grade, adjustments: [], rejected: [], decidedBy: "rules" } : null;

export async function runAssessment(l: RawListing, lot: Candidate | null, deps: Deps, ctx: AssessContext = {}): Promise<Assessment> {
  const { adu = null, planLines = [], site = null } = ctx;
  const st: RunState = { trace: [], models: new Set() };
  const meter = deps.meter ?? new RunMeter(AGENTS.budget.perRunMaxTokens);
  const tokNote = (from: number) => {
    const u = meter.since(from);
    return u.input + u.output ? ` · ${u.input} in / ${u.output} out tokens${u.cacheRead ? `, ${u.cacheRead} cached` : ""}` : "";
  };

  // Node 1, deterministic gate: an HOA ends the run. No model is called.
  const excluded = await step(st, "gate", "deterministic", async () => {
    const x = hoaExcluded(l);
    return { value: x, note: x ? `HOA of ${usd(l.hoaMonthly!)} per month: excluded` : "no HOA exclusion" };
  });
  if (excluded) {
    const headline = `Not a candidate. This property has an HOA (${usd(l.hoaMonthly!)} per month), and a property with an HOA is never a DADU candidate.`;
    return { verdict: "excluded", headline, findings: [], confirm: [], unavailable: [], citations: [], text: headline, models: [], trace: st.trace, score: null };
  }

  // Other hard gates from the guide (lot under 3,200 sf, ADU cap, no room). Code decides; no model is called.
  const failed = site ? site.gates.filter((g) => g.status === "fail") : [];
  if (failed.length) {
    st.trace.push({ node: "gate", kind: "deterministic", ms: 0, ok: true, note: `failed: ${failed.map((g) => g.label).join(", ")}` });
    const headline = `Not a candidate. ${failed.map((g) => g.note).join(" ")}`;
    return { verdict: "excluded", headline, findings: [], confirm: [], unavailable: [], citations: [], text: headline, models: [], trace: st.trace, score: null };
  }

  // Node 2, deterministic facts.
  const facts = await step(st, "facts", "deterministic", async () => {
    const f = buildFacts(l, lot, adu, planLines, site);
    return { value: f, note: `${f.length} labelled facts${adu ? " (incl. ADUniverse)" : ""}${site?.eligible ? `, baseline ${site.score}` : ""}` };
  });

  // Over today's budget: no model calls at all. The rules score stands, labelled.
  if ((deps.dailyLeft ?? Infinity) <= 0) {
    st.trace.push({ node: "budget", kind: "deterministic", ms: 0, ok: false, note: "daily token budget reached: rules-only" });
    const headline = "The AI review is paused for today (token budget reached). This is the rules score from the site guide.";
    return { verdict: "unverified", headline, findings: [], confirm: [], unavailable: [], citations: [], text: headline, models: [], trace: st.trace, score: rulesOnly(site) };
  }

  // Node 3, fuzzy (small model): features the city data cannot see, from the listing text. Every quote is checked.
  const description = l.detail?.description?.trim() ?? "";
  const small = pick(deps, "small");
  const extracted = await step(st, "extract", "llm", async () => {
    if (!description || !small) return { value: [] as Extracted[], note: description ? "skipped: no small model" : "skipped: no listing text" };
    const from = meter.calls.length;
    try {
      st.models.add(small.model);
      const r = await small.llm.json<{ features: Extracted[] }>({
        model: small.model, system: EXTRACT_SYSTEM, user: description.slice(0, 2500), toolName: "report_features",
        schema: EXTRACT_SCHEMA as unknown as Record<string, unknown>, maxTokens: AGENTS.nodes.extract.maxTokens, temperature: 0,
      });
      const kept = checkExtracted(r.features ?? [], description);
      return { value: kept, note: `${kept.length} kept of ${(r.features ?? []).length}${tokNote(from)}` };
    } catch (e) {
      return { value: [] as Extracted[], ok: false, note: `skipped: ${e instanceof Error ? e.message.slice(0, 80) : "failed"}` };
    }
  });
  for (const x of extracted) facts.push({ label: `F${facts.length + 1}`, text: `Listing text mentions ${FEATURE_TEXT[x.feature]}: "${x.quote}"`, source: "listing description" });

  // Node 4, fuzzy (small model): HyDE. A hypothetical guide passage, searched alongside the question. If this fails, search without it.
  const factBlock = facts.map((f) => `${f.label} ${f.text}`).join("\n");
  const hyde = await step(st, "hyde", "llm", async () => {
    if (!small) return { value: "", ok: false, note: "skipped: no small model" };
    const from = meter.calls.length;
    try {
      st.models.add(small.model);
      const t = await small.llm.text({ model: small.model, system: HYDE_SYSTEM, user: factBlock, maxTokens: AGENTS.nodes.hyde.maxTokens, temperature: 0 });
      const ok = t.length > 20 && t.length < 900;
      return { value: ok ? t : "", ok, note: (ok ? "hypothetical passage written" : "rejected: empty or too long, searching without it") + tokNote(from) };
    } catch (e) {
      return { value: "", ok: false, note: `skipped: ${e instanceof Error ? e.message.slice(0, 100) : "failed"}` };
    }
  });

  // Node 4, deterministic retrieval: documents first, then chunks inside them.
  const question = `DADU screening rules for a ${lot?.lotType ?? "single-family"} lot with no HOA in Seattle`;
  // Also pull how the score works and the guidance behind the weakest factors, so adjustments can be grounded.
  const weakest = site?.eligible ? [...site.factors].sort((a, b) => a.score - b.score).slice(0, 2).map((f) => f.name.toLowerCase()) : [];
  const extra = site?.eligible ? [`How the DADU site score, factors and grades work; ${weakest.join(" and ")}`, `Market fit for a DADU: target size, price and oversupplied unit types`] : [];
  const passages = await step(st, "retrieve", "deterministic", async () => {
    const R = AGENTS.retrieve;
    const lists = await Promise.all([deps.search(question, { k: R.k, hyde: hyde || undefined }), ...extra.map((q) => deps.search(q, { k: R.extraQueryK }).catch(() => [] as Passage[]))]);
    const seen = new Set<string>();
    // Trim passages: the analysis needs the rule, not the whole section.
    const p = lists.flat().filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).slice(0, R.maxPassages)
      .map((x, i) => ({ ...x, label: `P${i + 1}`, text: x.text.length > R.maxCharsPerPassage ? `${x.text.slice(0, R.maxCharsPerPassage)}…` : x.text }));
    return { value: p, ok: p.length > 0, note: `${p.length} passages from ${new Set(p.map((x) => x.docId)).size} documents${hyde ? " (HyDE)" : ""}${extra.length ? `, ${extra.length + 1} queries` : ""}` };
  });

  // Nothing retrieved: say so. Do not ask a model to improvise.
  if (!passages.length) {
    const headline = "Data unavailable in retrieved sources. The knowledge base returned nothing for this property.";
    return { verdict: "unverified", headline, findings: [], confirm: ["Add the Seattle DADU rules to rag/documents and re-index."], unavailable: ["All DADU rules"], citations: [], text: headline, models: [...st.models], trace: st.trace, score: rulesOnly(site) };
  }

  // Node 5, fuzzy: grounded analysis with a forced schema. The mid model by default; the large one when the case is close.
  const passageBlock = passages.map((p) => `${p.label} [${p.docId} > ${p.section}] ${p.text}`).join("\n\n");
  const E = AGENTS.escalate;
  const reasons: string[] = [];
  if (site?.eligible && GRADE_BANDS.some((g) => g.min > 0 && Math.abs(site.score - g.min) <= E.nearBoundaryPts)) reasons.push("near a grade boundary");
  if (E.onExtractedSignals && extracted.length) reasons.push("listing text adds access or unit features");
  if (E.onConflicts && lot && l.lotSqft > 0 && Math.abs(l.lotSqft - lot.lotSqft) / lot.lotSqft > 0.1) reasons.push("listing and city lot sizes disagree");
  const analyst = (reasons.length && pick(deps, E.to)) || pick(deps, "mid");
  if (!analyst) throw new Error("No model is configured for the analysis.");
  // Run budget: the analysis gets what is left, capped by its own limit. Too little left means rules-only.
  const room = Math.min(AGENTS.nodes.analyze.maxTokens, meter.left - 2500);
  if (room < 300) {
    st.trace.push({ node: "budget", kind: "deterministic", ms: 0, ok: false, note: `run token budget reached (${meter.total} used): rules-only` });
    const headline = "The AI review was skipped for this run (token budget). This is the rules score from the site guide.";
    return { verdict: "unverified", headline, findings: [], confirm: [], unavailable: [], citations: [], text: headline, models: [...st.models], trace: st.trace, score: rulesOnly(site) };
  }
  let analysis: Analysis;
  try {
    analysis = await step(st, "analyze", "llm", async () => {
    st.models.add(analyst.model);
    const from = meter.calls.length;
    const a = await analyst.llm.json<Analysis>({
      model: analyst.model,
      system: ANALYZE_SYSTEM,
      user: `FACTS:\n${factBlock}\n\nPASSAGES:\n${passageBlock}\n\n${site?.eligible ? "Screen this listing and decide its score: keep the rules baseline or adjust it." : "Screen this listing. There is no baseline score for it."}`,
      toolName: "report_screening",
      schema: ANALYZE_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: room,
      temperature: 0,
    });
    return { value: a, note: `${analyst.model}${reasons.length ? ` (escalated: ${reasons.join(", ")})` : ""}: verdict ${a.verdict}, ${a.findings?.length ?? 0} findings, ${a.adjustments?.length ?? 0} score adjustments${tokNote(from)}` };
    });
  } catch {
    // The failure is already in the trace. Show the rules score, said plainly, instead of an empty review.
    const headline = "The AI review could not finish for this listing. This is the rules score from the site guide.";
    return { verdict: "unverified", headline, findings: [], confirm: [], unavailable: [], citations: [], text: headline, models: [...st.models], trace: st.trace, score: rulesOnly(site), tokens: meter.total, costUsd: Math.round(meter.costUsd * 1e6) / 1e6 };
  }

  // Node 6, deterministic validation. Findings that cite nothing real, or carry numbers the sources lack, are dropped.
  const { kept, dropped } = await step(st, "validate", "deterministic", async () => {
    const v = validateFindings(analysis.findings ?? [], passages, facts);
    return { value: v, ok: v.dropped.length === 0, note: `${v.kept.length} kept, ${v.dropped.length} dropped${v.dropped[0] ? ` (${v.dropped[0].reason})` : ""}` };
  });
  const { verdict, extraConfirm } = enforceVerdict(analysis, { hasLot: !!lot, keptFindings: kept.length });

  // Node 7, deterministic: the score Claude decided, after every adjustment is checked.
  const score = await step(st, "decide score", "deterministic", async () => {
    if (!site?.eligible) return { value: null as ScoreDecision | null, note: "no baseline for this lot" };
    const v = validateAdjustments(analysis.adjustments ?? [], passages, facts, site.factors.map((f) => f.name), site.score);
    const g = gradeOf(v.score);
    const d: ScoreDecision = { baselineScore: site.score, score: v.score, tier: g.tier, grade: g.label, adjustments: v.kept, rejected: v.rejected, decidedBy: "ai" };
    return { value: d, ok: v.rejected.length === 0, note: `${site.score} -> ${v.score} (${g.label}), ${v.kept.length} adjustments kept, ${v.rejected.length} rejected${v.rejected[0] ? ` (${v.rejected[0].reason})` : ""}` };
  });
  const unavailable = dropped.map((d) => d.claim);

  const used = new Set([...kept.flatMap((k) => k.cites), ...(score?.adjustments ?? []).flatMap((a) => a.cites)]);
  const citations: Citation[] = [
    ...passages.filter((p) => used.has(p.label)).map((p) => ({ label: p.label, docId: p.docId, section: p.section })),
    ...facts.filter((f) => used.has(f.label)).map((f) => ({ label: f.label, docId: f.source, section: f.text.split(":")[0] })),
  ];
  const confirm = [...(analysis.confirm ?? []), ...extraConfirm].slice(0, 6);
  // The badge and the headline must agree. When the checks above changed the model's verdict, its headline no longer
  // fits, so the page says plainly why instead.
  const headline = !kept.length
    ? "Data unavailable in retrieved sources. None of the model's findings could be tied to a source."
    : verdict !== analysis.verdict
      ? `This could work, but it needs confirming first. ${extraConfirm[0] ?? "The checks could not confirm the model's read."}`
      : analysis.headline;
  return { verdict, headline, findings: kept, confirm, unavailable, citations, text: render({ headline, findings: kept, confirm, unavailable }), models: [...st.models], trace: st.trace, score, tokens: meter.total, costUsd: Math.round(meter.costUsd * 1e6) / 1e6 };
}
