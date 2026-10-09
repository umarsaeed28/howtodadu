import { slotFor, CAPACITY } from "@/lib/queue";
import { customPlanCounts } from "@/lib/server/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/custom/queue → the slot a custom plan bought now would get: { week, readyBy, booked, capacity }. */
export async function GET() {
  const now = new Date();
  const slot = slotFor(now, await customPlanCounts(now));
  return Response.json({ ...slot, capacity: CAPACITY }, { headers: { "Cache-Control": "no-store" } });
}
