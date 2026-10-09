"use server";

import { revalidatePath } from "next/cache";
import { currentViewer, userClient } from "@/lib/portal/server";
import { mergeAssumptions } from "@/lib/invest/assumptions";
import { clearLiveFeed, computeFeed, storeSnapshot } from "@/lib/server/invest";

/** Saves the Invest cost assumptions (admins only), then reruns today's feed with them. */
export async function saveInvestSettings(_: { error?: string; ok?: boolean }, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const v = await currentViewer();
  if (!v || v.role !== "admin") return { error: "Admins only." };
  const raw: Record<string, unknown> = Object.fromEntries(fd.entries());
  raw.financeConstruction = fd.get("financeConstruction") === "on";
  const data = mergeAssumptions(raw);
  const db = await userClient();
  const { error } = await db.from("invest_settings").upsert({ id: 1, data, updated_by: v.id, updated_at: new Date().toISOString() });
  if (error) return { error: error.message.includes("invest_settings") ? "The invest_settings table is missing. Apply supabase/migrations/0010_invest.sql first." : error.message };
  clearLiveFeed();
  await storeSnapshot(await computeFeed()).catch(() => false);
  revalidatePath("/invest");
  revalidatePath("/admin/invest");
  return { ok: true };
}
