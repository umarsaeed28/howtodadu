import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { weekOf, ymd } from "@/lib/queue";

/**
 * Service orders (migration 0009). Written with the secret key from server routes only. When the table is not
 * there yet (migration not applied) or Supabase is not configured, recordOrder still returns an id and token so
 * the test-mode flow keeps working, and logs that the order was not stored.
 */
export type OrderKind = "feasibility_instant" | "feasibility_reviewed" | "custom_plan" | "permit" | "plan_request";

export type NewOrder = {
  kind: OrderKind;
  email: string;
  parcelPin: string;
  address: string;
  ownerId?: string | null;
  projectId?: string | null;
  status: "pending" | "paid";
  amountCents: number;
  provider?: string | null;
  paymentId?: string | null;
  dueDate?: string | null;
  queueWeek?: string | null;
  planId?: string | null;
  firm?: string | null;
  data?: Record<string, unknown>;
};

export async function recordOrder(o: NewOrder): Promise<{ id: string; token: string; stored: boolean }> {
  const fallback = { id: randomUUID(), token: randomBytes(18).toString("hex"), stored: false };
  const db = supabaseAdmin();
  if (!db) {
    console.warn(`[orders] Supabase not configured; ${o.kind} order not stored`);
    return fallback;
  }
  const { data, error } = await db
    .from("service_orders")
    .insert({
      kind: o.kind,
      email: o.email.toLowerCase(),
      parcel_pin: o.parcelPin,
      address: o.address,
      owner_id: o.ownerId ?? null,
      project_id: o.projectId ?? null,
      status: o.status,
      amount_cents: o.amountCents,
      payment_provider: o.provider ?? null,
      payment_id: o.paymentId ?? null,
      paid_at: o.status === "paid" ? new Date().toISOString() : null,
      due_date: o.dueDate ?? null,
      queue_week: o.queueWeek ?? null,
      plan_id: o.planId ?? null,
      firm: o.firm ?? null,
      data: o.data ?? {},
    })
    .select("id, access_token")
    .single();
  if (error || !data) {
    console.warn(`[orders] ${o.kind} order not stored: ${error?.message ?? "no row"}`);
    return fallback;
  }
  return { id: data.id as string, token: data.access_token as string, stored: true };
}

/** Custom plans per drafting week, from this week on, for the queue. Empty when the table is not there. */
export async function customPlanCounts(now = new Date()): Promise<Record<string, number>> {
  const db = supabaseAdmin();
  if (!db) return {};
  const { data, error } = await db
    .from("service_orders")
    .select("queue_week")
    .eq("kind", "custom_plan")
    .neq("status", "cancelled")
    .gte("queue_week", weekOf(now));
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const r of data) {
    const w = typeof r.queue_week === "string" ? r.queue_week.slice(0, 10) : null;
    if (w) counts[w] = (counts[w] ?? 0) + 1;
  }
  return counts;
}

/** Links unowned orders placed with this email to the account (on sign-in or sign-up). */
export async function claimOrders(userId: string, email: string): Promise<number> {
  const db = supabaseAdmin();
  if (!db || !email) return 0;
  const { data } = await db.from("service_orders").update({ owner_id: userId, updated_at: new Date().toISOString() }).is("owner_id", null).ilike("email", email).select("id");
  return data?.length ?? 0;
}

export const today = () => ymd(new Date());
