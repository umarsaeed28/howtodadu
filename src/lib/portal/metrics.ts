import { PERMIT_PACKAGE, referralFeeCents, type Activity, type FeasibilityRow, type PermitPackage, type Project, type Referral, type Stage } from "./types";

/** The admin's numbers, from the rows alone, so they are the same in a test and on the page. */
export type Metrics = {
  feasibilityRuns: number;
  projectsWithFeasibility: number;
  permitPackagesPaid: number;
  /** Projects that paid for a permit package over projects that ran a feasibility, as a percent. */
  feasibilityToPermitPct: number | null;
  /** Average days spent in each stage, from the stage-change entries in the activity log. */
  cycleDaysByStage: Partial<Record<Stage, number>>;
  avgCorrectionRounds: number | null;
  /** Average days from permit submittal to approval. */
  avgApprovalDays: number | null;
  revenueCents: { permit: number; referral: number; brokerage: number; total: number };
};

const DAY = 86_400_000;

function avg(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function computeMetrics(input: { projects: Project[]; feasibility: FeasibilityRow[]; permits: PermitPackage[]; referrals: Referral[]; activity: Activity[]; now?: Date }): Metrics {
  const now = input.now ?? new Date();
  const withFeas = new Set(input.feasibility.map((f) => f.project_id));
  const paid = input.permits.filter((p) => p.paid_at);
  const paidWithFeas = paid.filter((p) => withFeas.has(p.project_id)).length;

  // Time in each stage: from the moment a project entered it (its creation for the first stage) to the next change.
  const cycle: Record<string, number[]> = {};
  for (const p of input.projects) {
    const changes = input.activity
      .filter((a) => a.project_id === p.id && a.kind === "stage_change" && typeof a.meta?.to === "string")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    let stage: string = typeof changes[0]?.meta?.from === "string" ? (changes[0].meta.from as string) : "acquire";
    let since = new Date(p.created_at).getTime();
    for (const c of changes) {
      const t = new Date(c.created_at).getTime();
      (cycle[stage] ??= []).push((t - since) / DAY);
      stage = c.meta.to as string;
      since = t;
    }
    if (stage === p.stage) (cycle[stage] ??= []).push((now.getTime() - since) / DAY);
  }
  const cycleDaysByStage: Partial<Record<Stage, number>> = {};
  for (const [s, xs] of Object.entries(cycle)) {
    const a = avg(xs);
    if (a != null) cycleDaysByStage[s as Stage] = Math.round(a * 10) / 10;
  }

  const rounds = avg(paid.map((p) => p.correction_rounds));
  const approvalDays = avg(input.permits.filter((p) => p.submitted_at && p.approved_at).map((p) => (new Date(p.approved_at!).getTime() - new Date(p.submitted_at!).getTime()) / DAY));

  const permitRevenue = paid.reduce((s, p) => s + (p.fee_cents || PERMIT_PACKAGE.feeCents), 0);
  const referralRevenue = input.referrals.filter((r) => r.status === "paid").reduce((s, r) => s + (referralFeeCents(r) ?? 0), 0);
  const brokerage = input.projects.reduce((s, p) => s + (p.brokerage_fee_cents || 0), 0);

  return {
    feasibilityRuns: input.feasibility.length,
    projectsWithFeasibility: withFeas.size,
    permitPackagesPaid: paid.length,
    feasibilityToPermitPct: withFeas.size ? Math.round((paidWithFeas / withFeas.size) * 100) : null,
    cycleDaysByStage,
    avgCorrectionRounds: rounds == null ? null : Math.round(rounds * 10) / 10,
    avgApprovalDays: approvalDays == null ? null : Math.round(approvalDays),
    revenueCents: { permit: permitRevenue, referral: referralRevenue, brokerage, total: permitRevenue + referralRevenue + brokerage },
  };
}
