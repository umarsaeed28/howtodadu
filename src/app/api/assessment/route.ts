import { NextResponse } from "next/server";
import { getListingsProvider } from "@/lib/listings";
import { findLotForListing } from "@/lib/server/lot-library-store";
import { assessListing } from "@/lib/server/dadu-assessment";

/** GET /api/assessment?id=<mlsId>: RAG retrieval plus a Claude read of one listing. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const listing = await getListingsProvider().getById(id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  try {
    const a = await assessListing(listing, findLotForListing(listing.address, listing.lat, listing.lng));
    return NextResponse.json(a);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Assessment failed" }, { status: 503 });
  }
}
