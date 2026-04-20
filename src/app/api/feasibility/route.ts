import { NextRequest, NextResponse } from "next/server";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";

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

  return NextResponse.json(outcome.data);
}
