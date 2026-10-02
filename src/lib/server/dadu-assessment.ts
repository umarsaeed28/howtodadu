import { createHash } from "node:crypto";
import type { Candidate } from "@/lib/server/candidates";
import type { RawListing } from "@/lib/listings";
import { AnthropicLlm } from "@/lib/ai/llm";
import { archival } from "@/lib/ai/memory";
import { buildFacts, hoaExcluded, runAssessment } from "@/lib/ai/orchestrator";
import type { Assessment } from "@/lib/ai/types";
import { knowledgeAvailable, knowledgeSearch } from "./rag";
import { getAduniverseFacts } from "./aduniverse";
import { planSite } from "@/lib/dadu-site-plan";
import { ecaFlagsOf, scoreSite } from "@/lib/dadu-score";
import { assessViaApi, pencilApiConfigured } from "./pencil-api";

export { hoaExcluded };
export type { Assessment };

/**
 * Assess one listing. In production the Pencil API (FastAPI + LangGraph) runs the graph; locally, without
 * PENCIL_API_URL, the in-app chain runs instead. Results are cached by a hash of the facts.
 */
export async function assessListing(l: RawListing, lot: Candidate | null, clientIp?: string): Promise<Assessment> {
  // The HOA gate needs no model and no knowledge base.
  if (hoaExcluded(l)) return runAssessment(l, lot, { search: async () => [] });

  const viaApi = pencilApiConfigured();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!viaApi && !key) throw new Error("ANTHROPIC_API_KEY is not set.");
  if (!viaApi && !knowledgeAvailable()) throw new Error("The knowledge base (rag/documents) is missing from this deployment.");

  const adu = lot ? await getAduniverseFacts(lot.pin) : null; // ADUniverse adds ADU counts, garage, basement and critical-area flags
  const plan = lot ? planSite({ lotSqft: lot.lotSqft, widthFt: adu?.raw.lotWidth ?? null, depthFt: adu?.raw.lotDepth ?? null, alley: lot.alley }) : null;
  const planLines = plan?.lines ?? [];
  const site = lot
    ? scoreSite({
        lotSqft: lot.lotSqft, widthFt: lot.lotWidth ?? adu?.raw.lotWidth ?? null, depthFt: lot.lotDepth ?? adu?.raw.lotDepth ?? null,
        alley: lot.alley, corner: lot.corner, daduSqft: lot.daduSqft, steepPct: lot.steepPct, canopyPct: lot.canopyPct,
        ecaFlags: ecaFlagsOf(adu?.raw), existingAdus: lot.existingAdus ?? adu?.raw.totalADU ?? null, sideClearanceFt: lot.sideClearanceFt ?? null, zoning: lot.zoning, hoaMonthly: l.hoaMonthly ?? null,
      })
    : null;
  if (viaApi) return assessViaApi(l, lot, buildFacts(l, lot, adu, planLines, site), site, clientIp); // the API caches and rate-limits
  const memKey = `${l.mlsId}:${createHash("sha1").update(buildFacts(l, lot, adu, planLines, site).map((f) => f.text).join("|")).digest("hex").slice(0, 12)}`;
  const hit = archival.get<Assessment>(memKey);
  if (hit) return { ...hit, cached: true };

  const a = await runAssessment(l, lot, { llm: new AnthropicLlm(key!), search: (q, o) => knowledgeSearch(q, o) }, { adu, planLines, site });
  archival.set(memKey, a);
  return a;
}
