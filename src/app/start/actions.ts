"use server";

import { redirect } from "next/navigation";
import { currentViewer, logActivity, userClient } from "@/lib/portal/server";
import { pullParcel } from "@/app/portal/actions";
import { isPin } from "@/lib/parcel-context";

/**
 * Starts a portal project from the lot the visitor last checked. If they already have a project on that parcel,
 * opens it instead of making a second one. Otherwise creates it and runs the parcel pull (feasibility saved,
 * stage set to Feasibility), then opens the project.
 */
export async function startProjectFromLot(fd: FormData): Promise<{ error?: string }> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const pin = String(fd.get("pin") ?? "");
  const address = String(fd.get("address") ?? "").trim().slice(0, 200);
  if (!address) return { error: "We lost the address. Start from a new address instead." };
  const db = await userClient();

  if (isPin(pin)) {
    const { data: existing } = await db.from("projects").select("id").eq("owner_id", v.id).eq("parcel_id", pin).limit(1).maybeSingle();
    if (existing) redirect(`/portal/projects/${existing.id}`);
  }

  const { data, error } = await db.from("projects").insert({ owner_id: v.id, address, parcel_id: isPin(pin) ? pin : null, stage: "acquire" }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Could not start the project." };
  await logActivity(db, data.id, v.id, "note", `Project started for ${address}`);
  const pulled = await pullParcel(data.id);
  if (pulled.error) console.warn("[start] parcel pull failed:", pulled.error);
  redirect(`/portal/projects/${data.id}`);
}
