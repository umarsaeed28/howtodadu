import { describe, expect, it } from "vitest";
import { computeMetrics } from "./metrics";
import { matchGcs, nextAction, referralFeeCents, sizeTierFor, type Activity, type BuildRequest, type FeasibilityRow, type GcPartner, type PermitPackage, type Project, type Referral } from "./types";

const project = (over: Partial<Project> = {}): Project => ({
  id: "p1", owner_id: "u1", address: "610 N 125th St, Seattle, WA", parcel_id: null, stage: "feasibility", lot_help_requested: false, lot_help_notes: "", brokerage_fee_cents: 0,
  selected_gc_id: null, build_status: null, latest_update: "", created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", ...over,
});
const feas: FeasibilityRow = { id: "f1", project_id: "p1", score: 80, verdict: "Feasible", max_dadu_sf: 900, buildable_area_sf: 1200, summary: {}, created_at: "2026-09-02T00:00:00Z" };
const permit = (over: Partial<PermitPackage> = {}): PermitPackage => ({ id: "k1", project_id: "p1", status: "kickoff", fee_cents: 1_500_000, payment_id: "x", paid_at: "2026-09-10T00:00:00Z", correction_rounds: 0, submitted_at: null, approved_at: null, created_at: "2026-09-10T00:00:00Z", updated_at: "2026-09-10T00:00:00Z", ...over });
const empty = { feasibility: null, permit: null, designs: [], buildRequest: null, bids: [] };

describe("nextAction", () => {
  it("walks the client through the stages", () => {
    expect(nextAction({ ...empty, project: project({ stage: "acquire" }) })).toMatchObject({ who: "client", text: /pull the parcel/i });
    expect(nextAction({ ...empty, project: project({ stage: "acquire", address: null, lot_help_requested: true }) })).toMatchObject({ who: "pencil" });
    expect(nextAction({ ...empty, project: project(), feasibility: feas })).toMatchObject({ who: "client", text: /permit package/i });
    expect(nextAction({ ...empty, project: project({ stage: "permit" }), feasibility: feas })).toMatchObject({ text: /pay/i });
    expect(nextAction({ ...empty, project: project({ stage: "permit" }), permit: permit({ status: "client_approval" }) })).toMatchObject({ who: "client", text: /approve/i });
    expect(nextAction({ ...empty, project: project({ stage: "permit" }), permit: permit({ status: "corrections", correction_rounds: 2 }) })).toMatchObject({ who: "pencil", text: /round 2/ });
    expect(nextAction({ ...empty, project: project({ stage: "permit" }), permit: permit({ status: "approved" }) })).toMatchObject({ text: /build quote/i });
  });

  it("in build: questionnaire, then bids, then the tracker", () => {
    const req: BuildRequest = { id: "r", project_id: "p1", budget_tier: "250k_400k", timeline: "", finishes: "", financing: "", area: "north", size_tier: "medium", disclosure_ack_at: "2026-09-20T00:00:00Z", created_at: "2026-09-20T00:00:00Z" };
    expect(nextAction({ ...empty, project: project({ stage: "build" }) })).toMatchObject({ who: "client", text: /questionnaire/i });
    expect(nextAction({ ...empty, project: project({ stage: "build" }), buildRequest: req })).toMatchObject({ who: "pencil" });
    const bid = { id: "b", project_id: "p1", gc_id: "g", amount_cents: 1, timeline_weeks: 1, notes: "", status: "submitted" as const, created_at: "" };
    expect(nextAction({ ...empty, project: project({ stage: "build" }), buildRequest: req, bids: [bid] })).toMatchObject({ who: "client", text: /1 bid/ });
    expect(nextAction({ ...empty, project: project({ stage: "build", build_status: "framing" }), buildRequest: req })).toMatchObject({ who: "gc", text: /Framing/ });
    expect(nextAction({ ...empty, project: project({ stage: "build", build_status: "certificate_of_occupancy" }), buildRequest: req })).toMatchObject({ who: "done" });
  });
});

describe("referral fee and lead matching", () => {
  it("computes percent and flat fees", () => {
    expect(referralFeeCents({ contract_value_cents: 30_000_000, fee_type: "percent", fee_value: 5 })).toBe(1_500_000);
    expect(referralFeeCents({ contract_value_cents: null, fee_type: "percent", fee_value: 5 })).toBeNull();
    expect(referralFeeCents({ contract_value_cents: null, fee_type: "flat", fee_value: 2500 })).toBe(250_000);
  });

  it("buckets DADU sizes and ranks builders by fit", () => {
    expect(sizeTierFor(500)).toBe("small");
    expect(sizeTierFor(900)).toBe("medium");
    expect(sizeTierFor(901)).toBe("large");
    const gc = (id: string, over: Partial<GcPartner>): GcPartner => ({ id, user_id: null, company: id, contact_name: "", email: `${id}@x.test`, phone: "", budget_tiers: [], areas: [], size_tiers: [], active: true, ...over });
    const req = { budget_tier: "250k_400k" as const, area: "north", size_tier: "medium" as const };
    const ranked = matchGcs(req, [gc("b", { budget_tiers: ["250k_400k"] }), gc("a", { budget_tiers: ["250k_400k"], areas: ["north"], size_tiers: ["medium"] }), gc("c", { active: false, budget_tiers: ["250k_400k"], areas: ["north"] })]);
    expect(ranked.map((r) => [r.gc.id, r.points])).toEqual([["a", 3], ["b", 1]]);
  });
});

describe("computeMetrics", () => {
  it("counts the funnel, cycle times and revenue by stream", () => {
    const now = new Date("2026-10-08T00:00:00Z");
    const projects = [project({ id: "p1", stage: "permit", brokerage_fee_cents: 500_000, created_at: "2026-09-01T00:00:00Z" }), project({ id: "p2", stage: "feasibility", created_at: "2026-10-01T00:00:00Z" })];
    const feasibility = [feas, { ...feas, id: "f2", project_id: "p2" }, { ...feas, id: "f3", project_id: "p2" }];
    const permits = [permit({ project_id: "p1", correction_rounds: 2, submitted_at: "2026-09-20T00:00:00Z", approved_at: "2026-09-30T00:00:00Z" })];
    const referrals: Referral[] = [{ id: "r", project_id: "p1", gc_id: "g", agreement_note: "", contract_value_cents: 30_000_000, fee_type: "percent", fee_value: 5, status: "paid", paid_at: "2026-10-01T00:00:00Z", created_at: "" }];
    const activity: Activity[] = [
      { id: "a1", project_id: "p1", actor_id: null, kind: "stage_change", message: "", meta: { from: "acquire", to: "feasibility" }, created_at: "2026-09-03T00:00:00Z" },
      { id: "a2", project_id: "p1", actor_id: null, kind: "stage_change", message: "", meta: { from: "feasibility", to: "permit" }, created_at: "2026-09-10T00:00:00Z" },
    ];
    const m = computeMetrics({ projects, feasibility, permits, referrals, activity, now });
    expect(m.feasibilityRuns).toBe(3);
    expect(m.projectsWithFeasibility).toBe(2);
    expect(m.permitPackagesPaid).toBe(1);
    expect(m.feasibilityToPermitPct).toBe(50);
    expect(m.cycleDaysByStage.acquire).toBe(2);
    expect(m.cycleDaysByStage.feasibility).toBe(7);
    expect(m.cycleDaysByStage.permit).toBe(28);
    expect(m.avgCorrectionRounds).toBe(2);
    expect(m.avgApprovalDays).toBe(10);
    expect(m.revenueCents).toEqual({ permit: 1_500_000, referral: 1_500_000, brokerage: 500_000, total: 3_500_000 });
  });
});
