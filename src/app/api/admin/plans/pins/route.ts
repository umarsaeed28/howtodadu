import { adminContext, errorJson } from "@/lib/admin/route-helpers";
import { precedentPins } from "@/lib/server/plan-library";

export const runtime = "nodejs";

/** GET: located plan sets, for the precedent pins on the admin map. */
export async function GET() {
  const c = await adminContext();
  if (!c.ok) return c.res;
  try {
    return Response.json({ ok: true, pins: await precedentPins(c.env) });
  } catch (e) {
    return errorJson(e);
  }
}
