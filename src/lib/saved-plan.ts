/**
 * The DADU a visitor drew on a lot's master plan, kept per parcel in this browser, so the drawing survives a reload,
 * goes into the PDF, and is the one saved when they start a project. Storage can be blocked; then the drawing lives
 * only as long as the page.
 */
export type SavedUnit = { kind: "dadu" | "aadu"; u: number; v: number; w: number; d: number; angle?: number; planId?: string };
export type SavedPlan = { stories: 1 | 2; units: SavedUnit[] };
export type DrawnSummary = { living: number; footprint: number; w: number; d: number; stories: 1 | 2 };
export type StoredPlan = { plan: SavedPlan; drawn: DrawnSummary | null; at: string };

const KEY = "pencil.plans.v1";

const readAll = (): Record<string, StoredPlan> => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : {};
    return v && typeof v === "object" ? (v as Record<string, StoredPlan>) : {};
  } catch {
    return {};
  }
};

export function isSavedPlan(v: unknown): v is SavedPlan {
  if (!v || typeof v !== "object") return false;
  const p = v as SavedPlan;
  return (p.stories === 1 || p.stories === 2) && Array.isArray(p.units) && p.units.every((u) => u && (u.kind === "dadu" || u.kind === "aadu") && [u.u, u.v, u.w, u.d].every((x) => typeof x === "number" && Number.isFinite(x)));
}

export function loadPlan(pin: string | null | undefined): StoredPlan | null {
  if (!pin) return null;
  const s = readAll()[pin];
  return s && isSavedPlan(s.plan) ? s : null;
}

export function savePlan(pin: string | null | undefined, plan: SavedPlan, drawn: DrawnSummary | null): void {
  if (!pin || !isSavedPlan(plan)) return;
  try {
    const all = readAll();
    all[pin] = { plan, drawn, at: new Date().toISOString() };
    // Keep the 20 most recent lots.
    const keep = Object.entries(all).sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, 20);
    window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    /* storage blocked */
  }
}

/** The stored drawing for a lot as a JSON string (stable between reads), for useSyncExternalStore. */
export function loadPlanJson(pin: string | null | undefined): string | null {
  const p = loadPlan(pin);
  return p ? JSON.stringify(p) : null;
}
