import { adminContext, errorJson } from "@/lib/admin/route-helpers";
import { listPlanSets } from "@/lib/server/plan-library";

export const runtime = "nodejs";

/** GET /api/admin/plans: the plan library status board (sets with their files). */
export async function GET() {
  const c = await adminContext();
  if (!c.ok) return c.res;
  try {
    return Response.json({ ok: true, sets: await listPlanSets(c.env) });
  } catch (e) {
    return errorJson(e);
  }
}
