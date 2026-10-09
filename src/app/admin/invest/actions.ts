"use server";

import { revalidatePath } from "next/cache";
import { adminDb, currentAdmin } from "@/lib/admin/server";
import { mergeAssumptions } from "@/lib/invest/assumptions";
import { clearLiveFeed, computeFeed, storeSnapshot } from "@/lib/server/invest";

/** Saves the Invest cost assumptions (admins only), then reruns today's feed with them. */
export async function saveInvestSettings(_: { error?: string; ok?: boolean }, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const a = await currentAdmin();
  if (!a) return { error: "Admins only." };
  const raw: Record<string, unknown> = Object.fromEntries(fd.entries());
  raw.financeConstruction = fd.get("financeConstruction") === "on";
  const data = mergeAssumptions(raw);
  const db = adminDb();
  const { error } = await db.from("invest_settings").upsert({ id: 1, data, updated_by: null, updated_at: new Date().toISOString() });
  if (error) return { error: error.message.includes("invest_settings") ? "The invest_settings table is missing. Apply supabase/migrations/0010_invest.sql first." : error.message };
  clearLiveFeed();
  await storeSnapshot(await computeFeed()).catch(() => false);
  revalidatePath("/search");
  revalidatePath("/admin/invest");
  return { ok: true };
}
