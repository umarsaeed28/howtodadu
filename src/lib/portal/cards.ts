import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bid, BuildRequest, DesignOption, FeasibilityRow, PermitPackage, Project, ProjectBundle } from "./types";

export type CardBundle = Pick<ProjectBundle, "project" | "feasibility" | "permit" | "designs" | "buildRequest" | "bids">;

/** Every project the viewer may see, with just enough to draw a card and its next action. Five queries, not five per project. */
export async function loadCards(db: SupabaseClient): Promise<CardBundle[]> {
  const { data: projects } = await db.from("projects").select("*").order("updated_at", { ascending: false });
  const list = (projects ?? []) as Project[];
  if (!list.length) return [];
  const ids = list.map((p) => p.id);
  const [feas, permits, designs, reqs, bids] = await Promise.all([
    db.from("feasibility_reports").select("*").in("project_id", ids).order("created_at", { ascending: false }),
    db.from("permit_packages").select("*").in("project_id", ids),
    db.from("design_options").select("*").in("project_id", ids),
    db.from("build_requests").select("*").in("project_id", ids),
    db.from("bids").select("*").in("project_id", ids),
  ]);
  const latestFeas = new Map<string, FeasibilityRow>();
  for (const f of (feas.data ?? []) as FeasibilityRow[]) if (!latestFeas.has(f.project_id)) latestFeas.set(f.project_id, f);
  const by = <T extends { project_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) (m.get(r.project_id) ?? m.set(r.project_id, []).get(r.project_id)!).push(r);
    return m;
  };
  const permitBy = new Map(((permits.data ?? []) as PermitPackage[]).map((p) => [p.project_id, p]));
  const reqBy = new Map(((reqs.data ?? []) as BuildRequest[]).map((r) => [r.project_id, r]));
  const designsBy = by((designs.data ?? []) as DesignOption[]);
  const bidsBy = by((bids.data ?? []) as Bid[]);
  return list.map((project) => ({
    project,
    feasibility: latestFeas.get(project.id) ?? null,
    permit: permitBy.get(project.id) ?? null,
    designs: designsBy.get(project.id) ?? [],
    buildRequest: reqBy.get(project.id) ?? null,
    bids: bidsBy.get(project.id) ?? [],
  }));
}
