import { NextResponse } from "next/server";
import { getAlleys } from "@/lib/server/alleys";

/** GET /api/alleys → every public alley in Seattle as GeoJSON polygons. */
export async function GET() {
  try {
    const data = await getAlleys();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Alleys unavailable" }, { status: 502 });
  }
}
