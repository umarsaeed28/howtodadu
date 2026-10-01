import { createHash } from "node:crypto";
import type { Candidate } from "@/lib/server/candidates";
import type { RawListing } from "@/lib/listings";
import { AnthropicLlm } from "@/lib/ai/llm";
import { archival } from "@/lib/ai/memory";
import { buildFacts, hoaExcluded, runAssessment } from "@/lib/ai/orchestrator";
import type { Assessment } from "@/lib/ai/types";
import { ragAvailable, ragSearch } from "./rag";
import { getAduniverseFacts } from "./aduniverse";
import { planSite } from "@/lib/dadu-site-plan";
import { ecaFlagsOf, scoreSite } from "@/lib/dadu-score";

export { hoaExcluded };
export type { Assessment };

/** Assess one listing. Results are kept in archival memory for 12 hours, keyed by the facts, so a changed listing is re-run. */
export async function assessListing(l: RawListing, lot: Candidate | null): Promise<Assessment> {
  // The HOA gate needs no model and no knowledge base.
  if (hoaExcluded(l)) return runAssessment(l, lot, { llm: null as never, search: async () => [] });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
  if (!ragAvailable()) throw new Error("The RAG knowledge base is not set up. Run the ingest in rag/.");

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
  const memKey = `${l.mlsId}:${createHash("sha1").update(buildFacts(l, lot, adu, planLines, site).map((f) => f.text).join("|")).digest("hex").slice(0, 12)}`;
  const hit = archival.get<Assessment>(memKey);
  if (hit) return { ...hit, cached: true };

  const a = await runAssessment(l, lot, { llm: new AnthropicLlm(key), search: (q, o) => ragSearch(q, o) }, { adu, planLines, site });
  archival.set(memKey, a);
  return a;
}
