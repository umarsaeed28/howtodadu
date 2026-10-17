import { adminContext, errorJson } from "@/lib/admin/route-helpers";
import { batchProblem, createBatch, type NewPlanSet } from "@/lib/server/plan-library";

export const runtime = "nodejs";

/** POST /api/admin/plans/batch {sets: [{title, folder, files: [{name, relPath, size}]}]}: rows plus signed upload URLs. */
export async function POST(req: Request) {
  const c = await adminContext();
  if (!c.ok) return c.res;
  let sets: NewPlanSet[];
  try {
    const b = (await req.json()) as { sets?: unknown };
    sets = (Array.isArray(b.sets) ? b.sets : []).map((s: Record<string, unknown>) => ({
      title: String(s?.title ?? ""),
      folder: String(s?.folder ?? ""),
      files: (Array.isArray(s?.files) ? s.files : []).map((f: Record<string, unknown>) => ({ name: String(f?.name ?? ""), relPath: String(f?.relPath ?? f?.name ?? ""), size: Number(f?.size) })),
    }));
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const problem = batchProblem(sets);
  if (problem) return Response.json({ ok: false, error: problem }, { status: 422 });
  try {
    return Response.json({ ok: true, sets: await createBatch(c.env, c.actor, sets) });
  } catch (e) {
    return errorJson(e);
  }
}
