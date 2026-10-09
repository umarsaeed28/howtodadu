import { permitTrackerStep, PERMIT_TRACKER_LABELS, type FeasibilityRow, type PermitPackage, type Project } from "./types";

/** A service order as the dashboard reads it (migration 0009). */
export type OrderRow = {
  id: string;
  kind: "feasibility_instant" | "feasibility_reviewed" | "custom_plan" | "permit" | "plan_request";
  status: string;
  parcel_pin: string;
  address: string;
  due_date: string | null;
  queue_week: string | null;
  plan_id: string | null;
  firm: string | null;
  project_id: string | null;
  created_at: string;
};

export type Line = { label: string; detail: string; state: "done" | "active" | "todo" };

export type Property = {
  key: string;
  pin: string | null;
  address: string;
  projectId: string | null;
  feasibility: Line;
  plan: Line;
  permit: Line;
  next: { text: string; href: string };
  updatedAt: string;
};

const day = (s: string | null) => {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const withParcel = (path: string, pin: string | null) => (pin ? `${path}?parcel=${pin}` : path);

/**
 * One card per property: the visitor's portal projects and service orders grouped by parcel (or address), each
 * with where feasibility, the plan and the permit stand, and the single next step.
 */
export function buildProperties(input: { projects: Project[]; feasibility: FeasibilityRow[]; permits: PermitPackage[]; orders: OrderRow[] }): Property[] {
  const groups = new Map<string, { pin: string | null; address: string; project: Project | null; orders: OrderRow[] }>();
  const keyOf = (pin: string | null | undefined, address: string | null | undefined) => (pin && /^\d{10}$/.test(pin) ? pin : (address ?? "").trim().toLowerCase());
  for (const p of input.projects) {
    const k = keyOf(p.parcel_id, p.address);
    if (!k) continue;
    groups.set(k, { pin: p.parcel_id, address: p.address ?? "", project: p, orders: groups.get(k)?.orders ?? [] });
  }
  for (const o of input.orders) {
    const fromProject = o.project_id ? input.projects.find((p) => p.id === o.project_id) : null;
    const k = fromProject ? keyOf(fromProject.parcel_id, fromProject.address) : keyOf(o.parcel_pin, o.address);
    if (!k) continue;
    const g = groups.get(k) ?? { pin: /^\d{10}$/.test(o.parcel_pin) ? o.parcel_pin : null, address: o.address, project: null, orders: [] };
    g.orders.push(o);
    if (!g.address) g.address = o.address;
    groups.set(k, g);
  }

  const out: Property[] = [];
  for (const [key, g] of groups) {
    const has = (k: OrderRow["kind"]) => g.orders.filter((o) => o.kind === k && o.status !== "cancelled" && o.status !== "failed");
    const reviewed = has("feasibility_reviewed")[0];
    const instant = has("feasibility_instant")[0];
    const feasRow = g.project ? input.feasibility.find((f) => f.project_id === g.project!.id) : undefined;
    const feasibility: Line = reviewed
      ? reviewed.status === "delivered" ? { label: "Feasibility", detail: "Architect review delivered", state: "done" } : { label: "Feasibility", detail: `Architect review due ${day(reviewed.due_date)}`, state: "active" }
      : instant ? { label: "Feasibility", detail: "Instant report", state: "done" }
      : feasRow ? { label: "Feasibility", detail: `Scored ${feasRow.score} (${feasRow.verdict})`, state: "done" }
      : { label: "Feasibility", detail: "Not yet", state: "todo" };

    const custom = has("custom_plan")[0];
    const request = has("plan_request")[0];
    const plan: Line = custom
      ? custom.status === "delivered" ? { label: "Plan", detail: "Custom plan delivered", state: "done" } : { label: "Plan", detail: `Custom plan, ready by ${day(custom.due_date)}`, state: "active" }
      : request ? { label: "Plan", detail: `Requested from ${request.firm ?? "the firm"}`, state: "active" }
      : { label: "Plan", detail: "Not chosen", state: "todo" };

    const pkg = g.project ? input.permits.find((p) => p.project_id === g.project!.id && p.paid_at) : undefined;
    const permitOrder = has("permit")[0];
    const step = pkg ? permitTrackerStep(pkg.status) : null;
    const permit: Line = step
      ? { label: "Permit", detail: step === "issued" ? "Permit issued" : PERMIT_TRACKER_LABELS[step] + (step === "corrections" && pkg!.correction_rounds ? ` (round ${pkg!.correction_rounds})` : ""), state: step === "issued" ? "done" : "active" }
      : permitOrder ? { label: "Permit", detail: "Paid; intake next", state: "active" }
      : { label: "Permit", detail: "Not started", state: "todo" };

    const next =
      feasibility.state === "todo" ? { text: "Next: check your lot", href: withParcel("/feasibility", g.pin) }
      : plan.state === "todo" ? { text: "Next: choose your plan", href: withParcel("/plans", g.pin) }
      : permitOrder && !pkg ? { text: "Next: finish the permit intake", href: withParcel("/permit", g.pin) }
      : permit.state === "todo" ? { text: plan.state === "done" ? "Next: start your permit" : "Next: start your permit when your plan is ready", href: withParcel("/permit", g.pin) }
      : step === "issued" ? { text: "Next: get a build quote", href: g.project ? `/portal/projects/${g.project.id}` : "/contact" }
      : { text: "Next: we'll email you at each step", href: g.project ? `/portal/projects/${g.project.id}` : withParcel("/permit", g.pin) };

    const times = [g.project?.updated_at, ...g.orders.map((o) => o.created_at)].filter((t): t is string => !!t).sort();
    out.push({ key, pin: g.pin, address: g.address, projectId: g.project?.id ?? null, feasibility, plan, permit, next, updatedAt: times[times.length - 1] ?? "" });
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
