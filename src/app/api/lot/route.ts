import { NextResponse } from "next/server";
import { getLot } from "@/lib/server/lot-library-store";

/** GET /api/lot?pin=1234567890 */
export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get("pin") ?? "";
  if (!/^\d{10}$/.test(pin)) return NextResponse.json({ error: "pin must be 10 digits" }, { status: 400 });
  const lot = getLot(pin);
  if (!lot) return NextResponse.json({ error: "Lot not in the library" }, { status: 404 });
  return NextResponse.json(lot, { headers: { "Cache-Control": "public, max-age=3600" } });
}
