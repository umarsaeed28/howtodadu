import { describe, expect, it } from "vitest";
import { buildProperties, type OrderRow } from "./dashboard";
import type { PermitPackage, Project } from "./types";

const order = (o: Partial<OrderRow>): OrderRow => ({ id: "o", kind: "feasibility_instant", status: "paid", parcel_pin: "1785500180", address: "610 N 125th St, Seattle, WA", due_date: null, queue_week: null, plan_id: null, firm: null, project_id: null, created_at: "2026-10-08T10:00:00Z", ...o });
const project = (p: Partial<Project>): Project => ({ id: "p1", owner_id: "u", address: "610 N 125th St, Seattle, WA", parcel_id: "1785500180", stage: "permit", lot_help_requested: false, lot_help_notes: "", brokerage_fee_cents: 0, selected_gc_id: null, build_status: null, latest_update: "", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-09T00:00:00Z", ...p });

describe("dashboard properties", () => {
  it("groups orders on the same parcel into one card and asks for the plan next", () => {
    const props = buildProperties({ projects: [], feasibility: [], permits: [], orders: [order({ id: "a" }), order({ id: "b", kind: "feasibility_reviewed", due_date: "2026-10-13" })] });
    expect(props).toHaveLength(1);
    expect(props[0].feasibility).toMatchObject({ detail: "Architect review due Oct 13", state: "active" });
    expect(props[0].plan.state).toBe("todo");
    expect(props[0].next).toEqual({ text: "Next: choose your plan", href: "/plans?parcel=1785500180" });
  });

  it("follows a custom plan into the permit, and the permit tracker", () => {
    const withPlan = buildProperties({ projects: [], feasibility: [], permits: [], orders: [order({}), order({ id: "c", kind: "custom_plan", due_date: "2026-10-16" })] })[0];
    expect(withPlan.plan.detail).toBe("Custom plan, ready by Oct 16");
    expect(withPlan.next.text).toBe("Next: start your permit when your plan is ready");

    const pkg = { id: "k", project_id: "p1", status: "corrections", fee_cents: 500000, payment_id: "o", paid_at: "2026-10-09", correction_rounds: 2, submitted_at: null, approved_at: null, created_at: "", updated_at: "" } as PermitPackage;
    const permitted = buildProperties({ projects: [project({})], feasibility: [], permits: [pkg], orders: [order({}), order({ id: "c", kind: "custom_plan", status: "delivered" }), order({ id: "pm", kind: "permit", project_id: "p1" })] })[0];
    expect(permitted.permit).toMatchObject({ detail: "Corrections (round 2)", state: "active" });
    expect(permitted.projectId).toBe("p1");
    expect(permitted.next.href).toBe("/portal/projects/p1");
  });

  it("says when the permit intake is still to do, and when the permit is issued", () => {
    const paidOnly = buildProperties({ projects: [], feasibility: [], permits: [], orders: [order({}), order({ id: "r", kind: "plan_request", firm: "Fivedot Architects" }), order({ id: "pm", kind: "permit" })] })[0];
    expect(paidOnly.plan.detail).toBe("Requested from Fivedot Architects");
    expect(paidOnly.next.text).toBe("Next: talk to us to start your permit");
    const pkg = { id: "k", project_id: "p1", status: "approved", fee_cents: 500000, payment_id: "o", paid_at: "x", correction_rounds: 1, submitted_at: null, approved_at: null, created_at: "", updated_at: "" } as PermitPackage;
    const issued = buildProperties({ projects: [project({})], feasibility: [], permits: [pkg], orders: [order({}), order({ id: "c", kind: "custom_plan", status: "delivered" })] })[0];
    expect(issued.permit).toMatchObject({ detail: "Permit issued", state: "done" });
    expect(issued.next.text).toBe("Next: get a build quote");
  });
});
