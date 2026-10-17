import "server-only";
import { supabaseAdmin } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "@/lib/portal/server";

/**
 * Buyers read their feasibility reports in the portal (the public tool is admin-only, src/lib/admin/gate.ts). A buyer
 * may see a lot's report when they paid for it (an order they own, or one bought as a guest with their verified email) or
 * when it is one of their portal projects. Nothing here returns data for any other lot.
 */

export interface BuyerReport {
  id: string;
  kind: "feasibility_instant" | "feasibility_reviewed";
  address: string;
  pin: string | null;
  status: string;
  paidAt: string | null;
  dueDate: string | null;
}

const LIVE = ["paid", "in_progress", "delivered"];

/** "1234 N 45th St, Seattle, WA 98103" and "1234 n 45th st" compare equal: street part, lower case, single spaces. */
export function addressKey(a: string): string {
  return a.split(",")[0].trim().toLowerCase().replace(/\s+/g, " ").replace(/\.$/, "");
}

/** The viewer's feasibility orders, newest first: owned ones, and guest ones bought with the viewer's verified email. */
export async function buyerReports(viewer: Viewer): Promise<BuyerReport[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  // Accounts are created without proving the email (migration 0008), so a guest order bought with this email counts
  // only once the email is verified; orders already linked to the account always count.
  const { data: profile } = await db.from("profiles").select("email_verified_at").eq("id", viewer.id).maybeSingle();
  const email = profile?.email_verified_at ? viewer.email.trim().toLowerCase() : "";
  // Two plain filters, merged, rather than an .or() string built from the email.
  const base = () =>
    db
      .from("service_orders")
      .select("id, kind, address, parcel_pin, status, paid_at, due_date, created_at")
      .in("kind", ["feasibility_instant", "feasibility_reviewed"])
      .in("status", LIVE)
      .order("created_at", { ascending: false })
      .limit(100);
  const [owned, guest] = await Promise.all([base().eq("owner_id", viewer.id), email ? base().eq("email", email) : Promise.resolve({ data: [], error: null })]);
  if (owned.error && guest.error) return [];
  const byId = new Map<string, NonNullable<typeof owned.data>[number]>();
  for (const o of [...(owned.data ?? []), ...(guest.data ?? [])]) byId.set(o.id, o);
  const data = [...byId.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return data.map((o) => ({
    id: o.id,
    kind: o.kind,
    address: o.address ?? "",
    pin: o.parcel_pin && o.parcel_pin !== "unknown" ? o.parcel_pin : null,
    status: o.status,
    paidAt: o.paid_at,
    dueDate: o.due_date,
  }));
}

/** One of the viewer's reports by order id, or null. */
export async function buyerReport(viewer: Viewer, orderId: string): Promise<BuyerReport | null> {
  return (await buyerReports(viewer)).find((r) => r.id === orderId) ?? null;
}

/** Whether the viewer may see feasibility data for this address: a paid report for it, or one of their projects. */
export async function viewerMaySeeLot(viewer: Viewer, userDb: SupabaseClient, address: string): Promise<boolean> {
  const key = addressKey(address);
  if (!key) return false;
  if ((await buyerReports(viewer)).some((r) => addressKey(r.address) === key)) return true;
  // Projects go through row-level security: the viewer's own (or, for staff, the ones they may see).
  const { data } = await userDb.from("projects").select("address").not("address", "is", null).limit(200);
  return (data ?? []).some((p: { address: string | null }) => p.address != null && addressKey(p.address) === key);
}
