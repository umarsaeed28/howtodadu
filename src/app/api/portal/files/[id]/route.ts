import { NextResponse } from "next/server";
import { userClient } from "@/lib/portal/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/** Opens a project file: RLS decides whether the viewer may see the row, then a short-lived signed URL serves it. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = await userClient();
  const { data: f } = await db.from("files").select("path, name").eq("id", id).maybeSingle();
  if (!f) return new Response("Not found", { status: 404 });
  const admin = supabaseAdmin();
  if (!admin) return new Response("Storage unavailable", { status: 503 });
  const { data, error } = await admin.storage.from("project-files").createSignedUrl(f.path, 300, { download: f.name });
  if (error || !data) return new Response("Could not open the file", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
