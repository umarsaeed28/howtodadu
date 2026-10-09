import { resolveParcel } from "@/lib/server/parcel-lookup";

/** GET /api/parcel?pin=0004000070 → { pin, address }. Lets any journey start from a parcel id alone. */
export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get("pin") ?? "";
  if (!/^\d{10}$/.test(pin)) return Response.json({ error: "pin must be 10 digits" }, { status: 400 });
  const p = await resolveParcel(pin);
  if (!p) return Response.json({ error: "Parcel not found" }, { status: 404 });
  return Response.json(p, { headers: { "Cache-Control": "public, max-age=86400" } });
}
