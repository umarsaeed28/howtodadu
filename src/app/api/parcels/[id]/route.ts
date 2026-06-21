import { NextResponse } from "next/server";

/** Parcel marketplace API disabled with the deal browser. */
export async function GET() {
  return NextResponse.json(
    { error: "The deal browser has been removed. Use /feasibility to check a property." },
    { status: 410 }
  );
}
