import type { RawListing } from "@/lib/listings";
import type { Candidate } from "@/lib/server/candidates";
import type { AduniverseFacts } from "@/lib/server/aduniverse";
import { ANALYZE_SCHEMA, ANALYZE_SYSTEM, HYDE_SYSTEM } from "./prompts";
import { FAST_MODEL, REASONING_MODEL } from "./llm";
import { enforceVerdict, validateAdjustments, validateFindings } from "./validate";
import type { Analysis, Assessment, Citation, Fact, Llm, Passage, ScoreDecision, TraceStep } from "./types";
import { gradeOf, type SiteScore } from "@/lib/dadu-score";

/**
 * The assessment chain. Autonomy level: semi-autonomous. The node order and every boundary are hardcoded;
 * the model plans the retrieval query (HyDE) and reasons over what was retrieved.
 *
 *   gate (code) -> facts (code) -> hyde (LLM, fast) -> retrieve (code) -> analyze (LLM, strong) -> validate (code) -> decide score (code) -> render (code)
 *
 * The rules baseline score (src/lib/dadu-score.ts) goes in as labelled facts. Claude decides the verdict and may move the
 * score with cited adjustments; code checks every adjustment and caps the total change at 15 points.
 *
 * Working memory is `RunState`: it lives for one run and carries each node's checked output to the next.
 */
export interface Deps {
  llm: Llm;
  search: (question: string, opts: { k?: number; hyde?: string }) => Promise<Passage[]>;
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
    [`HOA: ${l.hoaMonthly == null ? "unknown (not reported by the listing)" : l.hoaMonthly > 0 ? `${usd(l.hoaMonthly)} per month` : "none"}`, "listing feed"],
  ];
  if (lot) {
    rows.push(
      [`Lot: ${lot.lotSqft.toLocaleString("en-US")} sf, ${lot.lotType ?? "unknown"} lot, alley: ${lot.alley ? "yes" : "no"}, zoning ${lot.zoning}`, "city GIS"],
      [`Largest DADU the lot allows: ${lot.daduSqft ?? "none found"} sf. Site score ${lot.score} out of 100`, "city GIS"],
      [`Tree canopy ${lot.canopyPct == null ? "unknown" : Math.round(lot.canopyPct <= 1 ? lot.canopyPct * 100 : lot.canopyPct)}%, steep slope: ${lot.steepPct ? "yes" : "none"}, ${lot.adusNearby} ADUs nearby`, "city GIS"]
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

  // Node 3, fuzzy: HyDE. Write a hypothetical guide passage and search with it as well. If this fails, search without it.
  const factBlock = facts.map((f) => `${f.label} ${f.text}`).join("\n");
  const hyde = await step(st, "hyde", "llm", async () => {
    try {
      st.models.add(FAST_MODEL);
      const t = await deps.llm.text({ model: FAST_MODEL, system: HYDE_SYSTEM, user: factBlock, maxTokens: 220 });
      const ok = t.length > 20 && t.length < 900;
      return { value: ok ? t : "", ok, note: ok ? "hypothetical passage written" : "rejected: empty or too long, searching without it" };
    } catch (e) {
      return { value: "", ok: false, note: `skipped: ${e instanceof Error ? e.message.slice(0, 100) : "failed"}` };
    }
  });

  // Node 4, deterministic retrieval: documents first, then chunks inside them.
  const question = `DADU screening rules for a ${lot?.lotType ?? "single-family"} lot with ${l.hoaMonthly == null ? "unknown HOA" : "no HOA"} in Seattle`;
  // Also pull how the score works and the guidance behind the weakest factors, so adjustments can be grounded.
  const weakest = site?.eligible ? [...site.factors].sort((a, b) => a.score - b.score).slice(0, 2).map((f) => f.name.toLowerCase()) : [];
  const extra = site?.eligible ? [`How the DADU site score, factors and grades work; ${weakest.join(" and ")}`, `Market fit for a DADU: target size, price and oversupplied unit types`] : [];
  const passages = await step(st, "retrieve", "deterministic", async () => {
    const lists = await Promise.all([deps.search(question, { k: 6, hyde: hyde || undefined }), ...extra.map((q) => deps.search(q, { k: 3 }).catch(() => [] as Passage[]))]);
    const seen = new Set<string>();
    const p = lists.flat().filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).slice(0, 10).map((x, i) => ({ ...x, label: `P${i + 1}` }));
    return { value: p, ok: p.length > 0, note: `${p.length} passages from ${new Set(p.map((x) => x.docId)).size} documents${hyde ? " (HyDE)" : ""}${extra.length ? `, ${extra.length + 1} queries` : ""}` };
  });

  // Nothing retrieved: say so. Do not ask a model to improvise.
  if (!passages.length) {
    const headline = "Data unavailable in retrieved sources. The knowledge base returned nothing for this property.";
    return { verdict: "unverified", headline, findings: [], confirm: ["Add the Seattle DADU rules to rag/documents and re-index."], unavailable: ["All DADU rules"], citations: [], text: headline, models: [...st.models], trace: st.trace, score: rulesOnly(site) };
  }

  // Node 5, fuzzy: grounded analysis with step-by-step reasoning and a forced schema.
  const passageBlock = passages.map((p) => `${p.label} [${p.docId} > ${p.section}] ${p.text}`).join("\n\n");
  const analysis = await step(st, "analyze", "llm", async () => {
    st.models.add(REASONING_MODEL);
    const a = await deps.llm.json<Analysis>({
      model: REASONING_MODEL,
      system: ANALYZE_SYSTEM,
      user: `FACTS:\n${factBlock}\n\nPASSAGES:\n${passageBlock}\n\n${site?.eligible ? "Screen this listing and decide its score: keep the rules baseline or adjust it." : "Screen this listing. There is no baseline score for it."}`,
      toolName: "report_screening",
      schema: ANALYZE_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 1200,
    });
    return { value: a, note: `verdict ${a.verdict}, ${a.findings?.length ?? 0} findings, ${a.adjustments?.length ?? 0} score adjustments` };
  });

  // Node 6, deterministic validation. Findings that cite nothing real, or carry numbers the sources lack, are dropped.
  const { kept, dropped } = await step(st, "validate", "deterministic", async () => {
    const v = validateFindings(analysis.findings ?? [], passages, facts);
    return { value: v, ok: v.dropped.length === 0, note: `${v.kept.length} kept, ${v.dropped.length} dropped${v.dropped[0] ? ` (${v.dropped[0].reason})` : ""}` };
  });
  const { verdict, extraConfirm } = enforceVerdict(analysis, { hasLot: !!lot, hoaKnown: l.hoaMonthly != null, keptFindings: kept.length });

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
  const headline = kept.length ? analysis.headline : "Data unavailable in retrieved sources. None of the model's findings could be tied to a source.";
  return { verdict, headline, findings: kept, confirm, unavailable, citations, text: render({ headline, findings: kept, confirm, unavailable }), models: [...st.models], trace: st.trace, score };
}
