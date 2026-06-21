import { NextResponse } from "next/server";

/** Listing scan / deal marketplace removed. Feasibility check is the product surface. */
export async function GET() {
  return NextResponse.json(
    {
      error: "The deal browser has been removed. Use /feasibility to check a property.",
      parcels: [],
      total: 0,
    },
    { status: 410 }
  );
}
