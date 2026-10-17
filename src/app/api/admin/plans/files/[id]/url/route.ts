import { adminContext, errorJson } from "@/lib/admin/route-helpers";
import { signedFileUrl } from "@/lib/server/plan-library";

export const runtime = "nodejs";

/** GET: redirects to a 10-minute signed link for one PDF in the private bucket. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await adminContext();
  if (!c.ok) return c.res;
  try {
    return Response.redirect(await signedFileUrl(c.env, (await params).id), 302);
  } catch (e) {
    return errorJson(e, 404);
  }
}
