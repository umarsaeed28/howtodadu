import { NextResponse } from "next/server";
import { getListingsProvider } from "@/lib/listings";
import { listingToParcel } from "@/lib/enrich/toParcel";

/** GET /api/parcels/[id] → one enriched, underwritten parcel. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const provider = getListingsProvider();
    const listing = await provider.getById(id);
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const parcel = await listingToParcel(listing);
    return NextResponse.json({ parcel });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parcel unavailable" },
      { status: 502 }
    );
  }
}
