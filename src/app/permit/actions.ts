"use server";

import { revalidatePath } from "next/cache";
import { currentViewer, logActivity, notifyProject, userClient } from "@/lib/portal/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { PERMIT_PACKAGE } from "@/lib/portal/types";
import { isPin } from "@/lib/parcel-context";

const text = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

/**
 * The permit intake, after payment: confirms the parcel, links the plan (a Pencil order or an uploaded set) and
 * records the owner. Creates the project (stage permit) and its permit package, paid with the checkout's order,
 * and links the order to the project. The plan file, when there is one, is uploaded next by the browser.
 */
export async function submitPermitIntake(fd: FormData): Promise<{ projectId?: string; error?: string }> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const orderId = text(fd, "order_id", 60);
  const address = text(fd, "address", 200);
  const pin = text(fd, "pin", 10);
  const owner = text(fd, "owner_name", 120);
  const phone = text(fd, "owner_phone", 40);
  const mailing = text(fd, "owner_mailing", 300);
  const planSource = text(fd, "plan_source", 20);
  const planRef = text(fd, "plan_ref", 200);
  if (!orderId) return { error: "Missing the permit order. Pay first, then fill in the intake." };
  if (!address) return { error: "Confirm the property address." };
  if (!owner) return { error: "Tell us the owner's name as it appears on title." };
  if (fd.get("owner_confirm") !== "on") return { error: "Confirm that you own the property or are authorized by the owner." };

  const db = await userClient();
  const { data: project, error } = await db
    .from("projects")
    .insert({ owner_id: v.id, address, parcel_id: isPin(pin) ? pin : null, stage: "permit", latest_update: "Permit intake received" })
    .select("id")
    .single();
  if (error || !project) return { error: error?.message ?? "Could not start the permit project." };

  const now = new Date().toISOString();
  await db.from("permit_packages").insert({ project_id: project.id, status: "kickoff", fee_cents: PERMIT_PACKAGE.feeCents, payment_id: orderId, paid_at: now });
  // The order (written by the server, readable by its owner) now points at the project, with the intake answers.
  await supabaseAdmin()
    ?.from("service_orders")
    .update({ project_id: project.id, owner_id: v.id, status: "in_progress", updated_at: now, data: { intake: { owner, phone, mailing, planSource, planRef } } })
    .eq("id", orderId);
  await logActivity(db, project.id, v.id, "stage_change", "Permit intake received; Pencil is preparing the set", { from: "acquire", to: "permit" });
  await notifyProject(project.id, "Permit intake received", `${owner} started the permit service for ${address}. Plan: ${planSource === "upload" ? "uploaded set" : planRef || "to be linked"}.`, { owner: true, admins: true });
  revalidatePath("/permit");
  revalidatePath("/dashboard");
  return { projectId: project.id };
}
