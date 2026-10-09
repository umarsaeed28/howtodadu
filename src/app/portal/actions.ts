"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getFeasibilityForAddress } from "@/lib/server/feasibility-query";
import { summarizeFeasibility } from "@/lib/portal/feasibility-summary";
import { currentViewer, logActivity, notifyProject, userClient } from "@/lib/portal/server";
import { createPermitCheckout, stripeEnabled, verifyPermitCheckout } from "@/lib/portal/stripe";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { BUDGET_TIERS, BUILD_LABELS, BUILD_STATUSES, PERMIT_LABELS, PERMIT_PACKAGE, PERMIT_STATUSES, SIZE_TIERS, STAGES, STAGE_LABELS, sizeTierFor, type BuildStatus, type PermitStatus, type Stage } from "@/lib/portal/types";

/*
 * Every portal write. Each action signs the user in through cookies, writes with that user's client (so
 * row-level security decides what they may touch), logs the change and emails the people it concerns.
 * Actions return { error } instead of throwing so forms can show the message.
 */

type Result = { error?: string };

const text = (fd: FormData, key: string, max = 2000) => String(fd.get(key) ?? "").trim().slice(0, max);
const projectPath = (id: string) => `/portal/projects/${id}`;

function refresh(id?: string) {
  revalidatePath("/portal");
  revalidatePath("/admin");
  revalidatePath("/gc");
  if (id) revalidatePath(projectPath(id));
}

/* ── Acquire ── */

export async function createProject(fd: FormData): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const address = text(fd, "address", 200);
  const help = fd.get("mode") === "help";
  if (!help && !address) return { error: "Enter the property address, or ask for help finding a lot." };
  const db = await userClient();
  const { data, error } = await db
    .from("projects")
    .insert({ owner_id: v.id, address: help ? null : address, lot_help_requested: help, lot_help_notes: help ? text(fd, "notes") : "", stage: "acquire" })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create the project." };
  await logActivity(db, data.id, v.id, "note", help ? "Asked Pencil to help find a lot" : `Project started for ${address}`);
  if (help) await notifyProject(data.id, "New brokerage lead", `${v.name || v.email} is looking for a lot.\n\n${text(fd, "notes")}`, { admins: true });
  refresh();
  redirect(projectPath(data.id));
}

/** Pulls the parcel for the project's address, saves the free feasibility and moves to that stage. */
export async function pullParcel(projectId: string): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const db = await userClient();
  const { data: p } = await db.from("projects").select("id, address, stage").eq("id", projectId).maybeSingle();
  if (!p?.address) return { error: "Add the address first." };
  const outcome = await getFeasibilityForAddress(p.address);
  if (!outcome.ok) return { error: outcome.error };
  const s = summarizeFeasibility(outcome.data);
  const { error } = await db.from("feasibility_reports").insert({ project_id: projectId, score: s.score, verdict: s.verdict, max_dadu_sf: s.maxDaduSf, buildable_area_sf: s.buildableAreaSf, summary: s });
  if (error) return { error: error.message };
  await db.from("projects").update({ parcel_id: s.pin, address: outcome.data.parcel?.address ? `${outcome.data.parcel.address}, Seattle, WA` : p.address, stage: "feasibility" }).eq("id", projectId);
  await logActivity(db, projectId, v.id, "stage_change", `Parcel pulled; feasibility scored ${s.score} (${s.verdict})`, { from: p.stage, to: "feasibility" });
  await notifyProject(projectId, "Your feasibility is ready", `Score ${s.score}, ${s.verdict}. ${s.headline}`, { owner: true, admins: true });
  refresh(projectId);
  return {};
}

/** The admin filled in the address on a brokerage lead. */
export async function setAddress(projectId: string, fd: FormData): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const address = text(fd, "address", 200);
  if (!address) return { error: "Enter an address." };
  const db = await userClient();
  const { error } = await db.from("projects").update({ address, lot_help_requested: false }).eq("id", projectId);
  if (error) return { error: error.message };
  await logActivity(db, projectId, v.id, "note", `Address set to ${address}`);
  refresh(projectId);
  return {};
}

/* ── Permit package ── */

/** Starts the paid package: Stripe Checkout when it is wired, else a recorded test payment. */
export async function startPermitPackage(projectId: string): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const db = await userClient();
  const { data: p } = await db.from("projects").select("id, address").eq("id", projectId).maybeSingle();
  if (!p) return { error: "Project not found." };
  await db.from("permit_packages").upsert({ project_id: projectId, fee_cents: PERMIT_PACKAGE.feeCents }, { onConflict: "project_id", ignoreDuplicates: true });
  if (stripeEnabled()) {
    const h = await headers();
    const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
    const url = await createPermitCheckout({ projectId, address: p.address ?? "", email: v.email, origin });
    redirect(url);
  }
  return markPermitPaid(projectId, `test_${Date.now().toString(36)}`, v.id);
}

async function markPermitPaid(projectId: string, paymentId: string, actorId: string | null): Promise<Result> {
  const db = await userClient();
  const { data: pkg } = await db.from("permit_packages").select("paid_at, status").eq("project_id", projectId).maybeSingle();
  if (pkg?.paid_at) return {};
  const now = new Date().toISOString();
  const { error } = await db.from("permit_packages").update({ payment_id: paymentId, paid_at: now, status: "kickoff", updated_at: now }).eq("project_id", projectId);
  if (error) return { error: error.message };
  const { data: p } = await db.from("projects").select("stage").eq("id", projectId).maybeSingle();
  await db.from("projects").update({ stage: "permit" }).eq("id", projectId);
  await logActivity(db, projectId, actorId, "payment", "Permit package paid; kickoff scheduled", { payment_id: paymentId });
  await logActivity(db, projectId, actorId, "stage_change", "Moved to Architecture & permit", { from: p?.stage ?? "feasibility", to: "permit" });
  await notifyProject(projectId, "Permit package started", "Thank you. Your permit package is paid and kickoff is next.", { owner: true, admins: true });
  refresh(projectId);
  return {};
}

/** Back from Stripe Checkout: confirm the session before anything is marked paid. */
export async function confirmCheckout(sessionId: string): Promise<Result> {
  if (!stripeEnabled() || !sessionId || sessionId === "cancelled") return {};
  const v = await currentViewer();
  const s = await verifyPermitCheckout(sessionId);
  if (!s.paid || !s.projectId) return { error: "The payment did not complete." };
  return markPermitPaid(s.projectId, s.paymentId ?? sessionId, v?.id ?? null);
}

export async function decideDesign(projectId: string, optionId: string, decision: "approved" | "rejected"): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const db = await userClient();
  const { data: opt, error } = await db.from("design_options").update({ status: decision, decided_at: new Date().toISOString() }).eq("id", optionId).eq("project_id", projectId).select("title").single();
  if (error || !opt) return { error: error?.message ?? "Could not record the decision." };
  await logActivity(db, projectId, v.id, "approval", `${decision === "approved" ? "Approved" : "Passed on"} design option “${opt.title}”`);
  if (decision === "approved") {
    await db.from("permit_packages").update({ status: "drawings", updated_at: new Date().toISOString() }).eq("project_id", projectId);
    await logActivity(db, projectId, v.id, "status_change", "Design approved; drawings underway", { to: "drawings" });
  }
  await notifyProject(projectId, `Design option ${decision}`, `${v.name || v.email} ${decision} “${opt.title}”.`, { admins: true });
  refresh(projectId);
  return {};
}

/* ── Build ── */

export async function submitBuildRequest(projectId: string, fd: FormData): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  if (fd.get("disclosure") !== "on") return { error: "Please acknowledge the referral disclosure." };
  const budget = text(fd, "budget_tier");
  if (!(BUDGET_TIERS as readonly string[]).includes(budget)) return { error: "Pick a budget." };
  const db = await userClient();
  const { data: feas } = await db.from("feasibility_reports").select("max_dadu_sf").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const sizeIn = text(fd, "size_tier");
  const size = (SIZE_TIERS as readonly string[]).includes(sizeIn) ? sizeIn : sizeTierFor(feas?.max_dadu_sf);
  const { error } = await db.from("build_requests").upsert(
    { project_id: projectId, budget_tier: budget, timeline: text(fd, "timeline", 300), finishes: text(fd, "finishes", 300), financing: text(fd, "financing", 300), area: text(fd, "area", 40), size_tier: size, disclosure_ack_at: new Date().toISOString() },
    { onConflict: "project_id" },
  );
  if (error) return { error: error.message };
  const { data: p } = await db.from("projects").select("stage").eq("id", projectId).maybeSingle();
  if (p && p.stage !== "build") {
    await db.from("projects").update({ stage: "build" }).eq("id", projectId);
    await logActivity(db, projectId, v.id, "stage_change", "Moved to Build: quote requested", { from: p.stage, to: "build" });
  }
  await logActivity(db, projectId, v.id, "note", "Build questionnaire submitted");
  await notifyProject(projectId, "Build quote requested", `${v.name || v.email} answered the build questionnaire. Route the lead to builders.`, { admins: true });
  refresh(projectId);
  return {};
}

export async function selectBid(projectId: string, bidId: string): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const db = await userClient();
  const { data: bid } = await db.from("bids").select("id, gc_id, amount_cents").eq("id", bidId).eq("project_id", projectId).maybeSingle();
  if (!bid) return { error: "Bid not found." };
  await db.from("bids").update({ status: "declined" }).eq("project_id", projectId).neq("id", bidId);
  const { error } = await db.from("bids").update({ status: "selected" }).eq("id", bidId);
  if (error) return { error: error.message };
  await db.from("projects").update({ selected_gc_id: bid.gc_id }).eq("id", projectId);
  // The referral's contract value starts at the bid; the admin corrects it when the contract is signed.
  const admin = supabaseAdmin();
  if (admin) {
    await admin.from("referrals").update({ status: "won", contract_value_cents: bid.amount_cents }).eq("project_id", projectId).eq("gc_id", bid.gc_id);
    await admin.from("referrals").update({ status: "lost" }).eq("project_id", projectId).neq("gc_id", bid.gc_id).in("status", ["referred", "bid"]);
  }
  await logActivity(db, projectId, v.id, "bid", "Builder selected; contract next");
  await notifyProject(projectId, "A builder was selected", `${v.name || v.email} picked a bid. The builder should send the contract.`, { admins: true, gcIds: [bid.gc_id] });
  refresh(projectId);
  return {};
}

/* ── GC ── */

export async function submitBid(projectId: string, fd: FormData): Promise<Result> {
  const v = await currentViewer();
  if (!v || v.role !== "gc" || !v.gcId) return { error: "Only a partner builder can bid." };
  const amount = Math.round(Number(text(fd, "amount").replace(/[^0-9.]/g, "")) * 100);
  const weeks = Math.round(Number(text(fd, "weeks")));
  if (!amount || amount < 1000) return { error: "Enter the bid amount in dollars." };
  if (!weeks || weeks < 1) return { error: "Enter the build time in weeks." };
  const db = await userClient();
  const { error } = await db.from("bids").upsert({ project_id: projectId, gc_id: v.gcId, amount_cents: amount, timeline_weeks: weeks, notes: text(fd, "notes", 1000), status: "submitted" }, { onConflict: "project_id,gc_id" });
  if (error) return { error: error.message };
  const admin = supabaseAdmin();
  if (admin) await admin.from("referrals").update({ status: "bid" }).eq("project_id", projectId).eq("gc_id", v.gcId).eq("status", "referred");
  await logActivity(db, projectId, v.id, "bid", `Bid received: $${Math.round(amount / 100).toLocaleString("en-US")} over ${weeks} weeks`);
  await notifyProject(projectId, "New bid received", `A builder bid $${Math.round(amount / 100).toLocaleString("en-US")} with a ${weeks}-week build. Compare bids in the portal.`, { owner: true, admins: true });
  refresh(projectId);
  return {};
}

export async function setBuildStatus(projectId: string, status: string): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  if (!(BUILD_STATUSES as readonly string[]).includes(status)) return { error: "Unknown build status." };
  const db = await userClient();
  const { error } = await db.from("projects").update({ build_status: status as BuildStatus }).eq("id", projectId);
  if (error) return { error: error.message };
  await logActivity(db, projectId, v.id, "status_change", `Build: ${BUILD_LABELS[status as BuildStatus]}`, { to: status });
  await notifyProject(projectId, `Build update: ${BUILD_LABELS[status as BuildStatus]}`, `Your build moved to ${BUILD_LABELS[status as BuildStatus]}.`, { owner: true, admins: true });
  refresh(projectId);
  return {};
}

/* ── Admin ── */

async function requireAdmin() {
  const v = await currentViewer();
  return v && v.role === "admin" ? v : null;
}

export async function setStage(projectId: string, stage: string): Promise<Result> {
  const v = await requireAdmin();
  if (!v) return { error: "Admins only." };
  if (!(STAGES as readonly string[]).includes(stage)) return { error: "Unknown stage." };
  const db = await userClient();
  const { data: p } = await db.from("projects").select("stage").eq("id", projectId).maybeSingle();
  if (!p || p.stage === stage) return {};
  const { error } = await db.from("projects").update({ stage }).eq("id", projectId);
  if (error) return { error: error.message };
  await logActivity(db, projectId, v.id, "stage_change", `Moved to ${STAGE_LABELS[stage as Stage]}`, { from: p.stage, to: stage });
  await notifyProject(projectId, `Now in ${STAGE_LABELS[stage as Stage]}`, `Your project moved to ${STAGE_LABELS[stage as Stage]}.`, { owner: true });
  refresh(projectId);
  return {};
}

export async function setPermitStatus(projectId: string, status: string): Promise<Result> {
  const v = await requireAdmin();
  if (!v) return { error: "Admins only." };
  if (!(PERMIT_STATUSES as readonly string[]).includes(status)) return { error: "Unknown status." };
  const db = await userClient();
  const { data: pkg } = await db.from("permit_packages").select("status, correction_rounds").eq("project_id", projectId).maybeSingle();
  if (!pkg) return { error: "No permit package yet." };
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "corrections" && pkg.status !== "corrections") patch.correction_rounds = pkg.correction_rounds + 1;
  if (status === "submitted") patch.submitted_at = now;
  if (status === "approved") patch.approved_at = now;
  const { error } = await db.from("permit_packages").update(patch).eq("project_id", projectId);
  if (error) return { error: error.message };
  const label = PERMIT_LABELS[status as PermitStatus];
  const rounds = typeof patch.correction_rounds === "number" ? ` (round ${patch.correction_rounds})` : "";
  await logActivity(db, projectId, v.id, "status_change", `Permit: ${label}${rounds}`, { to: status });
  const action = status === "client_approval" ? " Please review the design options and approve one." : "";
  await notifyProject(projectId, `Permit package: ${label}`, `Your permit package is now at ${label}${rounds}.${action}`, { owner: true });
  refresh(projectId);
  return {};
}

export async function addDesignOption(projectId: string, fd: FormData): Promise<Result> {
  const v = await requireAdmin();
  if (!v) return { error: "Admins only." };
  const title = text(fd, "title", 120);
  if (!title) return { error: "Give the option a title." };
  const fileId = text(fd, "file_id", 40) || null;
  const db = await userClient();
  const { error } = await db.from("design_options").insert({ project_id: projectId, title, description: text(fd, "description", 1000), file_id: fileId });
  if (error) return { error: error.message };
  await db.from("permit_packages").update({ status: "client_approval", updated_at: new Date().toISOString() }).eq("project_id", projectId).in("status", ["kickoff", "design_options"]);
  await logActivity(db, projectId, v.id, "note", `Design option added: ${title}`);
  await notifyProject(projectId, "Action required: review a design option", `“${title}” is ready for your review. Approve it in the portal to move to drawings.`, { owner: true });
  refresh(projectId);
  return {};
}

export async function routeToGcs(projectId: string, fd: FormData): Promise<Result> {
  const v = await requireAdmin();
  if (!v) return { error: "Admins only." };
  const gcIds = fd.getAll("gc_id").map(String).filter(Boolean).slice(0, 3);
  if (!gcIds.length) return { error: "Pick one to three builders." };
  const feeType = text(fd, "fee_type") === "flat" ? "flat" : "percent";
  const feeValue = Number(text(fd, "fee_value").replace(/[^0-9.]/g, "")) || 0;
  const db = await userClient();
  const rows = gcIds.map((gc_id) => ({ project_id: projectId, gc_id, fee_type: feeType, fee_value: feeValue, agreement_note: text(fd, "agreement_note", 500), status: "referred" }));
  const { error } = await db.from("referrals").upsert(rows, { onConflict: "project_id,gc_id", ignoreDuplicates: true });
  if (error) return { error: error.message };
  await logActivity(db, projectId, v.id, "note", `Routed to ${gcIds.length} builder${gcIds.length === 1 ? "" : "s"} for bids`);
  await notifyProject(projectId, "New lead: a DADU to bid on", "Pencil referred a client to you. Open the project and submit your bid.", { gcIds });
  await notifyProject(projectId, "Builders are bidding", "We sent your project to builders. Bids will appear in your portal.", { owner: true });
  refresh(projectId);
  return {};
}

export async function updateReferral(referralId: string, fd: FormData): Promise<Result> {
  const v = await requireAdmin();
  if (!v) return { error: "Admins only." };
  const db = await userClient();
  const status = text(fd, "status");
  const contract = text(fd, "contract_value").replace(/[^0-9.]/g, "");
  const patch: Record<string, unknown> = {
    fee_type: text(fd, "fee_type") === "flat" ? "flat" : "percent",
    fee_value: Number(text(fd, "fee_value").replace(/[^0-9.]/g, "")) || 0,
    agreement_note: text(fd, "agreement_note", 500),
    contract_value_cents: contract ? Math.round(Number(contract) * 100) : null,
  };
  if (["referred", "bid", "won", "lost", "paid"].includes(status)) {
    patch.status = status;
    patch.paid_at = status === "paid" ? new Date().toISOString() : null;
  }
  const { data, error } = await db.from("referrals").update(patch).eq("id", referralId).select("project_id").single();
  if (error || !data) return { error: error?.message ?? "Could not save." };
  await logActivity(db, data.project_id, v.id, "note", status === "paid" ? "Referral fee marked paid" : "Referral updated");
  refresh(data.project_id);
  revalidatePath("/admin/referrals");
  return {};
}

export async function setBrokerageFee(projectId: string, fd: FormData): Promise<Result> {
  const v = await requireAdmin();
  if (!v) return { error: "Admins only." };
  const cents = Math.round(Number(text(fd, "fee").replace(/[^0-9.]/g, "")) * 100) || 0;
  const db = await userClient();
  const { error } = await db.from("projects").update({ brokerage_fee_cents: cents }).eq("id", projectId);
  if (error) return { error: error.message };
  refresh(projectId);
  return {};
}

export async function addUpdate(projectId: string, fd: FormData): Promise<Result> {
  const v = await requireAdmin();
  if (!v) return { error: "Admins only." };
  const message = text(fd, "message", 500);
  if (!message) return { error: "Write the update." };
  const db = await userClient();
  await logActivity(db, projectId, v.id, "note", message);
  await notifyProject(projectId, "Update on your project", message, { owner: true });
  refresh(projectId);
  return {};
}

/** Used by the file upload route after it stores the object. */
export async function recordFile(projectId: string, file: { name: string; path: string; kind: string; size: number }): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const db = await userClient();
  const { error } = await db.from("files").insert({ project_id: projectId, name: file.name, path: file.path, kind: file.kind, size_bytes: file.size, uploaded_by: v.id });
  if (error) return { error: error.message };
  await logActivity(db, projectId, v.id, "file", `New file: ${file.name}`);
  await notifyProject(projectId, `New file: ${file.name}`, `${v.name || v.email} added ${file.name} to the project.`, { owner: v.role !== "client", admins: v.role !== "admin" });
  refresh(projectId);
  return {};
}

/* ── Account ── */

export async function updateProfile(fd: FormData): Promise<Result> {
  const v = await currentViewer();
  if (!v) return { error: "Sign in first." };
  const full_name = text(fd, "full_name", 120);
  if (!full_name) return { error: "Enter your name." };
  const db = await userClient();
  const { error } = await db.from("profiles").update({ full_name }).eq("id", v.id);
  if (error) return { error: error.message };
  revalidatePath("/portal/account");
  return {};
}
