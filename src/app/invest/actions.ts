"use server";

import { revalidatePath } from "next/cache";
import { currentViewer, userClient } from "@/lib/portal/server";
import { getOpportunity, seattleDay } from "@/lib/server/invest";

export type WatchResult = { ok?: true; error?: "sign_in" | "not_found" | "failed" };

/**
 * "Add to my project": saves the opportunity to the client's dashboard with status Watching, with the numbers as
 * they stand now. The numbers come from the server's feed, never from the browser.
 */
export async function watchOpportunity(listingId: string): Promise<WatchResult> {
  const v = await currentViewer().catch(() => null);
  if (!v) return { error: "sign_in" };
  const found = await getOpportunity(listingId);
  if (!found) return { error: "not_found" };
  const o = found.opportunity;
  const db = await userClient();
  const { error } = await db.from("watchlist").upsert(
    {
      owner_id: v.id,
      listing_id: o.id,
      parcel_pin: o.pin,
      address: o.address,
      photo: o.photo,
      status: "watching",
      alert: null,
      snapshot: { price: o.price, cash_required: o.u.cashRequired, total_project_cost: o.u.totalProjectCost, dadu_sqft: o.daduSqft, score: o.score, as_of: seattleDay(new Date(found.feed.generatedAt)) },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,listing_id" },
  );
  if (error) {
    console.warn("[invest] watch failed:", error.message);
    return { error: "failed" };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function unwatchOpportunity(listingId: string): Promise<WatchResult> {
  const v = await currentViewer().catch(() => null);
  if (!v) return { error: "sign_in" };
  const db = await userClient();
  const { error } = await db.from("watchlist").delete().eq("owner_id", v.id).eq("listing_id", listingId);
  if (error) return { error: "failed" };
  revalidatePath("/dashboard");
  return { ok: true };
}
