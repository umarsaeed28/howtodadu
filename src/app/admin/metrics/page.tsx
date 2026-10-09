import type { Metadata } from "next";
import PortalFrame from "@/components/portal/PortalFrame";
import { adminDb, requireAdmin } from "@/lib/admin/server";
import { computeMetrics } from "@/lib/portal/metrics";
import { STAGES, STAGE_LABELS, usd, type Activity, type FeasibilityRow, type PermitPackage, type Project, type Referral } from "@/lib/portal/types";

export const metadata: Metadata = { title: "Metrics — Pencil admin" };
export const dynamic = "force-dynamic";

function Tile({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="pa-raised min-w-0 p-4">
      <p className="pa-display truncate text-2xl tabular-nums" style={{ color: "var(--ink)" }}>{v}</p>
      <p className="text-xs" style={{ color: "var(--slate)" }}>{k}{note ? ` · ${note}` : ""}</p>
    </div>
  );
}

export default async function MetricsPage() {
  const viewer = await requireAdmin("/admin/metrics");
  const db = adminDb();
  const [projects, feas, permits, referrals, activity] = await Promise.all([
    db.from("projects").select("*"),
    db.from("feasibility_reports").select("*"),
    db.from("permit_packages").select("*"),
    db.from("referrals").select("*"),
    db.from("activity_log").select("*").eq("kind", "stage_change"),
  ]);
  const m = computeMetrics({
    projects: (projects.data ?? []) as Project[],
    feasibility: (feas.data ?? []) as FeasibilityRow[],
    permits: (permits.data ?? []) as PermitPackage[],
    referrals: (referrals.data ?? []) as Referral[],
    activity: (activity.data ?? []) as Activity[],
  });
  const days = (n: number | undefined) => (n == null ? "—" : `${n} d`);
  return (
    <PortalFrame viewer={viewer} active="/admin/metrics" wide>
      <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Metrics</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>All time, from the projects and their logs.</p>

      <h2 className="pa-eyebrow mt-6" style={{ color: "var(--green)" }}>Funnel</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile k="Feasibility runs" v={String(m.feasibilityRuns)} note={`${m.projectsWithFeasibility} projects`} />
        <Tile k="Permit packages paid" v={String(m.permitPackagesPaid)} />
        <Tile k="Feasibility → permit" v={m.feasibilityToPermitPct == null ? "—" : `${m.feasibilityToPermitPct}%`} />
        <Tile k="Correction rounds" v={m.avgCorrectionRounds == null ? "—" : String(m.avgCorrectionRounds)} note="average per package" />
      </div>

      <h2 className="pa-eyebrow mt-6" style={{ color: "var(--green)" }}>Cycle time</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
        {STAGES.map((s) => <Tile key={s} k={STAGE_LABELS[s]} v={days(m.cycleDaysByStage[s])} note="avg in stage" />)}
        <Tile k="Submittal → approval" v={m.avgApprovalDays == null ? "—" : `${m.avgApprovalDays} d`} />
      </div>

      <h2 className="pa-eyebrow mt-6" style={{ color: "var(--green)" }}>Revenue by stream</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile k="Permit fees" v={usd(m.revenueCents.permit)} />
        <Tile k="Referral fees" v={usd(m.revenueCents.referral)} note="paid" />
        <Tile k="Brokerage" v={usd(m.revenueCents.brokerage)} />
        <Tile k="Total" v={usd(m.revenueCents.total)} />
      </div>
    </PortalFrame>
  );
}
