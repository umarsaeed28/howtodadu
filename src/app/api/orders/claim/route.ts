import { currentViewer } from "@/lib/portal/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * POST { orders: [{ orderId, token }] }: attaches guest orders bought in this browser to the signed-in account.
 * The access token proves the browser placed the order, so no one can claim an order by knowing an email alone.
 */
export async function POST(req: Request) {
  const v = await currentViewer().catch(() => null);
  if (!v) return Response.json({ ok: false, error: "sign_in_required" }, { status: 401 });
  let b: { orders?: unknown };
  try {
    b = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const list = Array.isArray(b.orders) ? b.orders.slice(0, 50) : [];
  const db = supabaseAdmin();
  if (!db) return Response.json({ ok: true, claimed: 0 });
  let claimed = 0;
  for (const o of list) {
    const id = typeof o?.orderId === "string" ? o.orderId : "";
    const token = typeof o?.token === "string" ? o.token : "";
    if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{20,64}$/.test(token)) continue;
    const { data } = await db.from("service_orders").update({ owner_id: v.id, updated_at: new Date().toISOString() }).eq("id", id).eq("access_token", token).is("owner_id", null).select("id");
    claimed += data?.length ?? 0;
  }
  return Response.json({ ok: true, claimed });
}
