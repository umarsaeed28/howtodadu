import { adminContext, errorJson } from "@/lib/admin/route-helpers";
import { PLAN_LICENSES, updatePlanSet, type PlanSetEdit } from "@/lib/server/plan-library";
import { sanitizeModel } from "@/lib/server/plan-extract";

export const runtime = "nodejs";

const optStr = (v: unknown, max: number) => (v === null ? null : typeof v === "string" ? v.trim().slice(0, max) || null : undefined);
const optNum = (v: unknown) => (v === null || v === "" ? null : typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined);

/** PATCH: the metadata form and the corrected BuildingModel; {verify: true} marks the set verified. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await adminContext();
  if (!c.ok) return c.res;
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const e: PlanSetEdit = {
    title: typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 200) : undefined,
    address: optStr(b.address, 300),
    neighborhood: optStr(b.neighborhood, 120),
    permit_number: optStr(b.permit_number, 60),
    built: typeof b.built === "boolean" || b.built === null ? (b.built as boolean | null) : undefined,
    build_cost_cents: optNum(b.build_cost_cents),
    permit_days: optNum(b.permit_days),
    license: (PLAN_LICENSES as readonly string[]).includes(b.license as string) ? (b.license as PlanSetEdit["license"]) : undefined,
    tags: Array.isArray(b.tags) ? b.tags.map((t) => String(t).trim().slice(0, 60)).filter(Boolean).slice(0, 20) : undefined,
    model: b.model === null ? null : b.model && typeof b.model === "object" ? sanitizeModel(b.model) : undefined,
    verify: b.verify === true,
  };
  try {
    return Response.json({ ok: true, set: await updatePlanSet(c.env, c.actor, (await params).id, e) });
  } catch (err) {
    return errorJson(err, 422);
  }
}
