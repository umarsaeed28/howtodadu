import { NextRequest, NextResponse } from "next/server";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { listingForAddress } from "@/lib/server/listing-for-address";
import { currentViewer, userClient } from "@/lib/portal/server";
import { viewerMaySeeLot } from "@/lib/server/buyer-reports";

export const runtime = "nodejs";

/**
 * Feasibility for a signed-in buyer, for a lot they paid for or have a project on (src/lib/server/buyer-reports.ts).
 * The same result as the admin-only /api/feasibility, for that one lot and nothing else.
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();
  if (!address) return NextResponse.json({ error: "Address parameter is required" }, { status: 400 });
  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ ok: false, error: "sign_in_required" }, { status: 401 });
  if (!(await viewerMaySeeLot(viewer, await userClient(), address))) {
    return NextResponse.json({ ok: false, error: "not_your_lot", message: "This report is not in your account." }, { status: 403 });
  }
  const outcome = await getFeasibilityForAddress(address);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error, code: outcome.code, zoning: outcome.zoning }, { status: outcome.status });
  const p = outcome.data.parcel;
  const listing = await listingForAddress(p?.address ?? address, p?.zip ?? null);
  return NextResponse.json({ ...outcome.data, listing });
}
