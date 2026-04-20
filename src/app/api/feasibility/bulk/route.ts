import { NextRequest, NextResponse } from "next/server";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { generateADUReport } from "@/lib/adu-analysis";
import type { BulkFeasibilityRow } from "@/lib/feasibility-bulk";
import {
  buildDashboardPropertyFailed,
  buildDashboardPropertySlim,
} from "@/lib/dashboard-normalize";

export const maxDuration = 300;

const MAX_ADDRESSES = 250;
const CONCURRENCY = 4;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]!, idx);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const addresses = (body as { addresses?: unknown })?.addresses;
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return NextResponse.json(
      { error: 'Request must include a non-empty "addresses" array' },
      { status: 400 }
    );
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const a of addresses) {
    if (typeof a !== "string") continue;
    const t = a.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(t);
    if (normalized.length >= MAX_ADDRESSES) break;
  }

  if (normalized.length === 0) {
    return NextResponse.json(
      { error: "No valid address strings in list" },
      { status: 400 }
    );
  }

  const rows = await mapPool(normalized, CONCURRENCY, async (address) => {
    const outcome = await getFeasibilityForAddress(address);
    if (!outcome.ok) {
      const row: BulkFeasibilityRow = {
        address,
        ok: false,
        error: outcome.error,
        row: buildDashboardPropertyFailed(address, outcome.error),
      };
      return row;
    }

    const report = generateADUReport(
      outcome.data.parcel,
      outcome.data.feasibility
    );

    const slim = buildDashboardPropertySlim(outcome.data, report);

    const row: BulkFeasibilityRow = {
      address,
      ok: true,
      row: slim,
      confidence: report.confidence,
      confidenceLabel: report.confidenceLabel,
      pin: outcome.data.parcel?.pin ?? null,
      lotSqft: outcome.data.parcel?.lotSqft ?? null,
      zoning: outcome.data.parcel?.zoning ?? null,
    };
    return row;
  });

  return NextResponse.json({ rows });
}
