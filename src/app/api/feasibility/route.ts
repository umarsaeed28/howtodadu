import { NextRequest, NextResponse } from "next/server";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { listingForAddress } from "@/lib/server/listing-for-address";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  const outcome = await getFeasibilityForAddress(address);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  // The home's own listing, when it is for sale: the report then shows the price next to the build estimate.
  const p = outcome.data.parcel;
  const listing = await listingForAddress(p?.address ?? address, p?.zip ?? null);
  return NextResponse.json({ ...outcome.data, listing });
}
