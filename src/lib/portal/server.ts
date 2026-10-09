import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { sendMail, portalUrl } from "./notify";
import type { Activity, Bid, BuildRequest, DesignOption, FeasibilityRow, GcPartner, PermitPackage, Project, ProjectBundle, ProjectFile, Referral, Role } from "./types";

/** The signed-in user's Supabase client: every read and write it makes goes through row-level security. */
export async function userClient(): Promise<SupabaseClient> {
  return createClient(await cookies());
}

export type Viewer = { id: string; email: string; name: string; role: Role; gcId: string | null };

/** Who is signed in, with their portal role. Null for visitors. */
export async function currentViewer(): Promise<Viewer | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const db = await userClient();
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: profile } = await db.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  const role = (profile?.role as Role | undefined) ?? "client";
  let gcId: string | null = null;
  if (role === "gc") {
    const { data: gc } = await db.from("gc_partners").select("id").eq("user_id", user.id).maybeSingle();
    gcId = gc?.id ?? null;
  }
  return { id: user.id, email: user.email ?? "", name: profile?.full_name ?? "", role, gcId };
}

/** The viewer, or a redirect to the sign-in page that comes back here afterwards. */
export async function requireViewer(nextPath: string, roles?: Role[]): Promise<Viewer> {
  const v = await currentViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (roles && !roles.includes(v.role)) redirect(homeFor(v.role));
  return v;
}

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "gc" ? "/gc" : "/dashboard";
}

/** One project with everything its page shows. Null when it does not exist or the viewer may not see it. */
export async function loadProjectBundle(db: SupabaseClient, id: string): Promise<ProjectBundle | null> {
  const { data: project } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) return null;
  const [feas, permit, files, designs, req, referrals, bids, gcs, activity] = await Promise.all([
    db.from("feasibility_reports").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("permit_packages").select("*").eq("project_id", id).maybeSingle(),
    db.from("files").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    db.from("design_options").select("*").eq("project_id", id).order("created_at"),
    db.from("build_requests").select("*").eq("project_id", id).maybeSingle(),
    db.from("referrals").select("*").eq("project_id", id).order("created_at"),
    db.from("bids").select("*").eq("project_id", id).order("amount_cents"),
    db.from("gc_partners").select("*").order("company"),
    db.from("activity_log").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  return {
    project: project as Project,
    feasibility: (feas.data as FeasibilityRow | null) ?? null,
    permit: (permit.data as PermitPackage | null) ?? null,
    files: (files.data as ProjectFile[]) ?? [],
    designs: (designs.data as DesignOption[]) ?? [],
    buildRequest: (req.data as BuildRequest | null) ?? null,
    referrals: (referrals.data as Referral[]) ?? [],
    bids: (bids.data as Bid[]) ?? [],
    gcs: (gcs.data as GcPartner[]) ?? [],
    activity: (activity.data as Activity[]) ?? [],
  };
}

export async function logActivity(db: SupabaseClient, projectId: string, actorId: string | null, kind: string, message: string, meta: Record<string, unknown> = {}) {
  await db.from("activity_log").insert({ project_id: projectId, actor_id: actorId, kind, message, meta });
  await db.from("projects").update({ latest_update: message, updated_at: new Date().toISOString() }).eq("id", projectId);
}

/**
 * Emails the people on a project. Recipients are looked up with the secret key, because a GC or a client
 * cannot read each other's profile rows; nothing else here bypasses RLS.
 */
export async function notifyProject(projectId: string, subject: string, text: string, to: { owner?: boolean; admins?: boolean; gcIds?: string[] }) {
  const admin = supabaseAdmin();
  if (!admin) return;
  const emails: string[] = [];
  if (to.owner) {
    const { data: p } = await admin.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
    if (p) {
      const { data: owner } = await admin.from("profiles").select("email").eq("id", p.owner_id).maybeSingle();
      if (owner?.email) emails.push(owner.email);
    }
  }
  if (to.admins) {
    const { data: admins } = await admin.from("profiles").select("email").eq("role", "admin");
    for (const a of admins ?? []) if (a.email) emails.push(a.email);
  }
  if (to.gcIds?.length) {
    const { data: gcs } = await admin.from("gc_partners").select("email").in("id", to.gcIds);
    for (const g of gcs ?? []) if (g.email) emails.push(g.email);
  }
  const link = portalUrl(`/portal/projects/${projectId}`);
  await sendMail({ to: Array.from(new Set(emails)), subject: `Pencil: ${subject}`, text: `${text}\n\nOpen the project: ${link}` });
}
