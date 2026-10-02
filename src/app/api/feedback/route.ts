import { appendFile, mkdir } from "fs/promises";
import path from "path";
import { syncFeedbackToGit } from "@/lib/server/feedback-git-sync";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data", "feedback");
const ENTRIES = path.join(DATA_DIR, "entries.jsonl");

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const record = { ...(body as Record<string, unknown>), serverReceivedAt: new Date().toISOString() };

  // Supabase when configured (production); otherwise the local file, as before.
  const db = supabaseAdmin();
  if (db) {
    const r = record as { id?: unknown; rating?: unknown; negativeReason?: unknown; appVersion?: unknown; snapshot?: { address?: unknown; parcelId?: unknown } };
    const rating = r.rating === "up" || r.rating === "down" ? r.rating : null;
    if (!rating) return Response.json({ ok: false, error: "invalid_rating" }, { status: 400 });
    const reason = typeof r.negativeReason === "string" ? r.negativeReason.slice(0, 2000) : null;
    const { error } = await db.from("feedback").insert({
      subject: String(r.snapshot?.address ?? r.snapshot?.parcelId ?? "unknown").slice(0, 300),
      rating,
      comment: reason ?? "",
      negative_reason: reason,
      app_version: typeof r.appVersion === "string" ? r.appVersion.slice(0, 100) : null,
      client_id: typeof r.id === "string" ? r.id.slice(0, 100) : null,
      snapshot: record,
    });
    if (error) {
      console.error("[feedback] supabase insert failed", error.message);
      return Response.json({ ok: false, error: "write_failed" }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  const line = JSON.stringify(record);
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(ENTRIES, `${line}\n`, "utf8");
  } catch (e) {
    console.error("[feedback] write failed", e);
    return Response.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  syncFeedbackToGit();

  return Response.json({ ok: true });
}
