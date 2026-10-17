import { adminContext, errorJson } from "@/lib/admin/route-helpers";
import { processPlanFile } from "@/lib/server/plan-extract";

export const runtime = "nodejs";
// Reading a drawing set with Claude can take a minute or two.
export const maxDuration = 300;

/** POST: extract one uploaded file (structure, then the draft BuildingModel). Safe to call twice. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await adminContext();
  if (!c.ok) return c.res;
  try {
    return Response.json({ ok: true, ...(await processPlanFile(c.env, (await params).id)) });
  } catch (e) {
    return errorJson(e);
  }
}
