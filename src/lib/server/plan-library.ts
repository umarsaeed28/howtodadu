import "server-only";
import { adminDb } from "@/lib/admin/server";
import type { AdminEnv } from "@/lib/admin/env";

/**
 * The plan library (migration 0013): architectural drawing sets the admin uploads, their files in the private
 * `plan-library` bucket, and what extraction found in them. Admin-only: every read and write here uses the admin's
 * chosen environment (the env switcher) and its secret key; there are no row-level policies for anyone else.
 */

export const PLAN_STATUSES = ["uploaded", "extracting", "needs_correction", "verified", "failed"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const PLAN_LICENSES = ["internal", "precedent", "template"] as const;
export type PlanLicense = (typeof PLAN_LICENSES)[number];

export interface Precedent {
  id: string;
  title: string;
  address: string | null;
  lat: number;
  lng: number;
  built: boolean | null;
  status: PlanStatus;
  license: PlanLicense;
  distanceM: number;
}

const R = 6_371_000;
export function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Plan sets with a known location within `radiusM` of a point, nearest first. */
export async function nearbyPrecedents(env: AdminEnv | null, lat: number, lng: number, radiusM = 1600, limit = 8): Promise<Precedent[]> {
  const db = adminDb(env);
  const dLat = radiusM / 111_000;
  const dLng = radiusM / (111_000 * Math.cos((lat * Math.PI) / 180));
  const { data, error } = await db
    .from("plan_sets")
    .select("id, title, address, lat, lng, built, status, license")
    .gte("lat", lat - dLat).lte("lat", lat + dLat)
    .gte("lng", lng - dLng).lte("lng", lng + dLng)
    .limit(200);
  if (error || !data) return [];
  return data
    .map((r) => ({ ...r, distanceM: Math.round(metersBetween(lat, lng, r.lat, r.lng)) }) as Precedent)
    .filter((r) => r.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

/** Every located plan set, for the precedent pins on the admin map. */
export async function precedentPins(env: AdminEnv | null): Promise<Omit<Precedent, "distanceM">[]> {
  const db = adminDb(env);
  const { data, error } = await db.from("plan_sets").select("id, title, address, lat, lng, built, status, license").not("lat", "is", null).not("lng", "is", null).limit(2000);
  return error || !data ? [] : (data as Omit<Precedent, "distanceM">[]);
}

/* ── Upload, status board, edits ── */

export const PLAN_BUCKET = "plan-library";
export const MAX_PLAN_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_FILES_PER_BATCH = 500;

export interface NewPlanSet {
  title: string;
  folder: string;
  files: { name: string; relPath: string; size: number }[];
}

export interface PlanFileRow {
  id: string;
  set_id: string;
  name: string;
  rel_path: string;
  storage_path: string;
  size_bytes: number;
  uploaded: boolean;
  page_count: number | null;
  pdf_kind: "vector" | "scanned" | "mixed" | null;
  sheets: import("@/lib/plans/building-model").Sheet[];
  extracted: import("@/lib/plans/building-model").BuildingModel | null;
  status: PlanStatus;
  error: string | null;
  updated_at: string;
}

export interface PlanSetRow {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  folder_path: string;
  tags: string[];
  address: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  permit_number: string | null;
  built: boolean | null;
  build_cost_cents: number | null;
  permit_days: number | null;
  license: PlanLicense;
  status: PlanStatus;
  status_note: string | null;
  draft_model: import("@/lib/plans/building-model").BuildingModel | null;
  model: import("@/lib/plans/building-model").BuildingModel | null;
  verified_at: string | null;
  files?: PlanFileRow[];
}

/** Why a batch cannot be accepted, or null. PDFs only, within size and count limits. */
export function batchProblem(sets: NewPlanSet[]): string | null {
  const files = sets.flatMap((s) => s.files);
  if (!sets.length || !files.length) return "No PDF files in the upload.";
  if (files.length > MAX_FILES_PER_BATCH) return `At most ${MAX_FILES_PER_BATCH} files per upload.`;
  for (const f of files) {
    if (!/\.pdf$/i.test(f.name)) return `${f.relPath} is not a PDF.`;
    if (!(f.size > 0) || f.size > MAX_PLAN_FILE_BYTES) return `${f.relPath} is ${f.size > 0 ? "over 100 MB" : "empty"}.`;
  }
  for (const s of sets) if (!s.title.trim()) return "Every plan set needs a title.";
  return null;
}

export async function audit(env: AdminEnv | null, actor: string, action: string, target: string | null, meta: Record<string, unknown> = {}): Promise<void> {
  await adminDb(env).from("admin_audit").insert({ actor, action, target, meta });
}

/**
 * Creates the sets and file rows of an upload and a signed upload URL per file (valid 2 hours), so the browser sends
 * each PDF straight to the private bucket. Nothing is processed until the browser confirms each upload.
 */
export async function createBatch(env: AdminEnv | null, actor: string, sets: NewPlanSet[]) {
  const db = adminDb(env);
  const { tagsFromFolder } = await import("@/lib/plans/building-model");
  const out: { setId: string; title: string; files: { fileId: string; relPath: string; uploadUrl: string }[] }[] = [];
  for (const s of sets) {
    const { data: set, error } = await db
      .from("plan_sets")
      .insert({ title: s.title.trim().slice(0, 200), folder_path: s.folder.slice(0, 500), tags: tagsFromFolder(s.folder), created_by: actor, status: "uploaded" })
      .select("id")
      .single();
    if (error || !set) throw new Error(`Could not create plan set "${s.title}": ${error?.message ?? "no row"}`);
    const files: { fileId: string; relPath: string; uploadUrl: string }[] = [];
    for (const f of s.files) {
      const fileId = crypto.randomUUID();
      const storagePath = `${set.id}/${fileId}.pdf`;
      const ins = await db.from("plan_files").insert({ id: fileId, set_id: set.id, name: f.name.slice(0, 300), rel_path: f.relPath.slice(0, 1000), storage_path: storagePath, size_bytes: f.size });
      if (ins.error) throw new Error(`Could not record ${f.relPath}: ${ins.error.message}`);
      const signed = await db.storage.from(PLAN_BUCKET).createSignedUploadUrl(storagePath);
      if (signed.error || !signed.data) throw new Error(`Could not sign the upload for ${f.relPath}: ${signed.error?.message ?? "no URL"}`);
      files.push({ fileId, relPath: f.relPath, uploadUrl: signed.data.signedUrl });
    }
    out.push({ setId: set.id, title: s.title, files });
  }
  await audit(env, actor, "plans.upload", null, { sets: out.length, files: out.reduce((n, s) => n + s.files.length, 0) });
  return out;
}

/** After the browser's PUT: checks the object is in the bucket, then marks the file uploaded (queued for extraction). */
export async function confirmUpload(env: AdminEnv | null, fileId: string): Promise<PlanFileRow> {
  const db = adminDb(env);
  const { data: file } = await db.from("plan_files").select("*").eq("id", fileId).maybeSingle();
  if (!file) throw new Error("No such file.");
  const [folder, name] = (file.storage_path as string).split("/");
  const listed = await db.storage.from(PLAN_BUCKET).list(folder, { search: name, limit: 1 });
  if (listed.error || !listed.data?.some((o) => o.name === name)) {
    await db.from("plan_files").update({ status: "failed", error: "The upload did not reach storage.", updated_at: new Date().toISOString() }).eq("id", fileId);
    throw new Error("The upload did not reach storage.");
  }
  const { data } = await db.from("plan_files").update({ uploaded: true, status: "uploaded", error: null, updated_at: new Date().toISOString() }).eq("id", fileId).select("*").single();
  return data as PlanFileRow;
}

/** The status board: sets newest first, with their files. */
export async function listPlanSets(env: AdminEnv | null, limit = 200): Promise<PlanSetRow[]> {
  const db = adminDb(env);
  const { data, error } = await db.from("plan_sets").select("*, files:plan_files(*)").order("created_at", { ascending: false }).limit(limit);
  if (error && /plan_sets|plan_files/.test(error.message) && /schema cache|does not exist/.test(error.message)) {
    throw new Error("The plan library is not set up in this environment yet: apply migration 0013_plan_library.sql.");
  }
  if (error) throw new Error(error.message);
  return (data ?? []) as PlanSetRow[];
}

/** A short-lived link to read one PDF (10 minutes). */
export async function signedFileUrl(env: AdminEnv | null, fileId: string): Promise<string> {
  const db = adminDb(env);
  const { data: file } = await db.from("plan_files").select("storage_path").eq("id", fileId).maybeSingle();
  if (!file) throw new Error("No such file.");
  const s = await db.storage.from(PLAN_BUCKET).createSignedUrl(file.storage_path as string, 600);
  if (s.error || !s.data) throw new Error(s.error?.message ?? "Could not sign the link.");
  return s.data.signedUrl;
}

export interface PlanSetEdit {
  title?: string;
  address?: string | null;
  neighborhood?: string | null;
  permit_number?: string | null;
  built?: boolean | null;
  build_cost_cents?: number | null;
  permit_days?: number | null;
  license?: PlanLicense;
  tags?: string[];
  model?: import("@/lib/plans/building-model").BuildingModel | null;
  verify?: boolean;
}

/** Saves the metadata form and the corrected model. A new address is located for the map; `verify` closes the review. */
export async function updatePlanSet(env: AdminEnv | null, actor: string, id: string, e: PlanSetEdit): Promise<PlanSetRow> {
  const db = adminDb(env);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ["title", "neighborhood", "permit_number", "built", "build_cost_cents", "permit_days", "license", "tags", "model"] as const) {
    if (e[k] !== undefined) patch[k] = e[k];
  }
  if (e.address !== undefined) {
    patch.address = e.address?.trim() || null;
    patch.lat = null;
    patch.lng = null;
    if (patch.address) {
      const { searchAddresses } = await import("@/lib/server/address-search");
      const hit = (await searchAddresses(String(patch.address), { resolve: true }).catch(() => null))?.suggestions[0];
      if (hit?.lat != null && hit.lng != null) {
        patch.lat = hit.lat;
        patch.lng = hit.lng;
      }
    }
  }
  if (e.verify) {
    patch.status = "verified";
    patch.verified_at = new Date().toISOString();
    await db.from("plan_files").update({ status: "verified", updated_at: patch.updated_at }).eq("set_id", id).neq("status", "failed");
  }
  const { data, error } = await db.from("plan_sets").update(patch).eq("id", id).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "No such plan set.");
  await audit(env, actor, e.verify ? "plans.verify" : "plans.edit", id, { fields: Object.keys(patch).filter((k) => k !== "updated_at") });
  return data as PlanSetRow;
}

/** A set's status from its files: extracting while any file is; uploaded while any waits; failed only if all failed. */
export function setStatusFrom(current: PlanStatus, files: Pick<PlanFileRow, "status">[]): PlanStatus {
  if (current === "verified") return "verified";
  if (files.some((f) => f.status === "extracting")) return "extracting";
  if (files.some((f) => f.status === "uploaded")) return "uploaded";
  if (files.length > 0 && files.every((f) => f.status === "failed")) return "failed";
  return "needs_correction";
}
