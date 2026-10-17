import { adminContext, errorJson } from "@/lib/admin/route-helpers";
import { confirmUpload } from "@/lib/server/plan-library";
import { refreshSet } from "@/lib/server/plan-extract";

export const runtime = "nodejs";

/** POST: the browser finished uploading this file; it is checked in storage and queued for extraction. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await adminContext();
  if (!c.ok) return c.res;
  try {
    const file = await confirmUpload(c.env, (await params).id);
    await refreshSet(c.env, file.set_id);
    return Response.json({ ok: true, file });
  } catch (e) {
    return errorJson(e, 422);
  }
}
