/**
 * Client for the Pencil API (services/api, FastAPI + LangGraph, a Vercel service reached over an internal binding). Server-side only: it carries the shared
 * secret. When PENCIL_API_URL is not set, callers fall back to the in-app chain (local development).
 */
import type { Assessment, Fact } from "@/lib/ai/types";
import type { SiteScore } from "@/lib/dadu-score";
import { GRADE_BANDS } from "@/lib/dadu-score";
import type { RawListing } from "@/lib/listings";
import type { Candidate } from "@/lib/server/candidates";

export const pencilApiConfigured = (): boolean => !!process.env.PENCIL_API_URL;

async function call<T>(path: string, body: unknown, clientIp?: string): Promise<T> {
  const res = await fetch(`${process.env.PENCIL_API_URL!.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.PENCIL_API_KEY ?? "", ...(clientIp ? { "x-client-ip": clientIp } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55_000),
    cache: "no-store",
  });
  if (res.status === 429) throw new Error("Too many AI reviews from you this hour. Try again later.");
  if (!res.ok) throw new Error(`The assessment service returned ${res.status}.`);
  return (await res.json()) as T;
}

/** The website computes the facts and the rules baseline (single source of truth); the API runs the graph. */
export function assessViaApi(l: RawListing, lot: Candidate | null, facts: Fact[], site: SiteScore | null, clientIp?: string): Promise<Assessment> {
  return call<Assessment>(
    "/v1/assess",
    {
      listing: { mlsId: l.mlsId, address: l.address, hoaMonthly: l.hoaMonthly ?? null, lotSqft: l.lotSqft ?? 0, description: l.detail?.description ?? "" },
      lot: lot ? { lotSqft: lot.lotSqft, lotType: lot.lotType } : null,
      facts,
      site: site ? { eligible: site.eligible, score: site.score, tier: site.tier, grade: site.grade, gates: site.gates, factors: site.factors } : null,
      gradeBands: GRADE_BANDS.map((b) => ({ tier: b.tier, label: b.label, min: b.min })),
    },
    clientIp
  );
}

export function sendFeedback(body: { subject: string; rating: "up" | "down"; comment?: string; snapshot?: Record<string, unknown> }, clientIp?: string): Promise<{ ok: boolean; id: string }> {
  return call("/v1/feedback", body, clientIp);
}
