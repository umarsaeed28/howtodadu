import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/utils/supabase/admin";

/**
 * The money ledger (migration 0011): one row per payment. Written with the secret key from the routes that take
 * money (checkout, the Stripe webhook); read by the admin's revenue page as the signed-in admin (RLS). A missing
 * table or an unconfigured Supabase never breaks a purchase: the write is logged and skipped.
 */
export type PurchaseKind = "order" | "permit" | "subscription" | "refund";

export interface NewPurchase {
  kind: PurchaseKind;
  product: string;
  amountCents: number;
  email?: string | null;
  userId?: string | null;
  orderId?: string | null;
  projectId?: string | null;
  provider?: string | null;
  /** The provider's payment id. Unique: a webhook delivered twice records one purchase. */
  paymentId?: string | null;
  meta?: Record<string, unknown>;
}

export async function recordPurchase(p: NewPurchase): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) {
    console.warn(`[purchases] Supabase not configured; ${p.product} ${p.amountCents} not recorded`);
    return false;
  }
  const { error } = await db.from("purchases").upsert(
    {
      kind: p.kind,
      product: p.product,
      amount_cents: p.amountCents,
      email: p.email?.toLowerCase() ?? null,
      user_id: p.userId ?? null,
      order_id: p.orderId ?? null,
      project_id: p.projectId ?? null,
      payment_provider: p.provider ?? null,
      payment_id: p.paymentId ?? null,
      meta: p.meta ?? {},
    },
    { onConflict: "payment_id", ignoreDuplicates: true }
  );
  if (error) {
    console.warn(`[purchases] not recorded: ${error.message}`);
    return false;
  }
  return true;
}

export interface PurchaseRow {
  id: string;
  created_at: string;
  kind: PurchaseKind;
  product: string;
  amount_cents: number;
  email: string | null;
  user_id: string | null;
  order_id: string | null;
  project_id: string | null;
  payment_provider: string | null;
  payment_id: string | null;
  meta: Record<string, unknown>;
}

/** Every purchase, newest first, as the signed-in admin. Empty when the table is not there yet. */
export async function listPurchases(db: SupabaseClient, limit = 500): Promise<{ rows: PurchaseRow[]; error: string | null }> {
  const { data, error } = await db.from("purchases").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as PurchaseRow[], error: null };
}
