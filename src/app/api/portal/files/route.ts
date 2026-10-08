import { recordFile } from "@/app/portal/actions";
import { userClient } from "@/lib/portal/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const KINDS = new Set(["drawing", "city_letter", "other"]);

/**
 * Uploads one file to a project. The viewer's client checks they own the project (RLS), the secret key stores
 * the object in the private bucket, and the files row is written as the viewer.
 */
export async function POST(req: Request) {
  const fd = await req.formData();
  const projectId = String(fd.get("project_id") ?? "");
  const kind = String(fd.get("kind") ?? "other");
  const file = fd.get("file");
  if (!projectId || !(file instanceof File) || !file.size) return Response.json({ ok: false, error: "missing_file" }, { status: 422 });
  if (file.size > MAX_BYTES) return Response.json({ ok: false, error: "too_large" }, { status: 413 });

  const db = await userClient();
  const { data: p } = await db.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!p) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  const admin = supabaseAdmin();
  if (!admin) return Response.json({ ok: false, error: "storage_unavailable" }, { status: 503 });

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";
  const path = `${projectId}/${Date.now().toString(36)}-${safeName}`;
  const { error } = await admin.storage.from("project-files").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "application/octet-stream" });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  const r = await recordFile(projectId, { name: file.name.slice(0, 200), path, kind: KINDS.has(kind) ? kind : "other", size: file.size });
  if (r.error) return Response.json({ ok: false, error: r.error }, { status: 403 });
  return Response.json({ ok: true });
}
