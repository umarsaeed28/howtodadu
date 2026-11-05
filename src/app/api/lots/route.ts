import { NextResponse } from "next/server";
import { getSlimLots } from "@/lib/server/lot-library-store";

/** GET /api/lots?zip=98103,98107  Omit zip for all of Seattle. */
export async function GET(req: Request) {
  const zipParam = new URL(req.url).searchParams.get("zip");
  const zips = zipParam ? zipParam.split(",").map((z) => z.trim()).filter((z) => /^98\d{3}$/.test(z)) : null;
  const data = getSlimLots(zips);
  if (!data) {
    return NextResponse.json({ error: "The lot library has not been built. Run: npm run build:lots" }, { status: 503 });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=600" } });
}
