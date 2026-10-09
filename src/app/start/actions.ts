"use server";

import { redirect } from "next/navigation";
import { currentViewer, logActivity, userClient } from "@/lib/portal/server";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { summarizeFeasibility } from "@/lib/portal/feasibility-summary";
import { isSavedPlan, type DrawnSummary, type SavedPlan } from "@/lib/saved-plan";
import { isPin } from "@/lib/parcel-context";

/**
 * Starts a portal project from the lot the visitor last checked. If they already have a project on that parcel,
 * opens it instead of making a second one. Otherwise creates it, saves the feasibility with the DADU the client drew
 * on the report (stage set to Feasibility), then opens the project.
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

  // The drawing the client left on the report's master plan comes with the project.
  let drawn: { plan: SavedPlan; dadu: DrawnSummary | null } | null = null;
  try {
    const raw = JSON.parse(String(fd.get("plan") ?? "null")) as { plan?: unknown; drawn?: DrawnSummary | null } | null;
    if (raw && isSavedPlan(raw.plan)) drawn = { plan: raw.plan, dadu: raw.drawn ?? null };
  } catch {
    drawn = null;
  }

  // The feasibility, run again now so the project holds today's reading, with the drawing attached.
  const outcome = await getFeasibilityForAddress(address);
  if (outcome.ok) {
    const s = summarizeFeasibility(outcome.data);
    await db.from("feasibility_reports").insert({ project_id: data.id, score: s.score, verdict: s.verdict, max_dadu_sf: s.maxDaduSf, buildable_area_sf: s.buildableAreaSf, summary: { ...s, drawn } });
    await db.from("projects").update({ parcel_id: s.pin ?? (isPin(pin) ? pin : null), stage: "feasibility" }).eq("id", data.id);
    await logActivity(db, data.id, v.id, "stage_change", `Feasibility carried over: scored ${s.score} (${s.verdict})`, { from: "acquire", to: "feasibility" });
    if (drawn?.dadu) await logActivity(db, data.id, v.id, "note", `DADU as drawn: ${drawn.dadu.w} x ${drawn.dadu.d} ft, ${drawn.dadu.living.toLocaleString("en-US")} sf${drawn.dadu.stories === 2 ? " over 2 stories" : ""}`);
  } else {
    console.warn("[start] feasibility failed:", outcome.error);
  }
  redirect(`/portal/projects/${data.id}`);
}
