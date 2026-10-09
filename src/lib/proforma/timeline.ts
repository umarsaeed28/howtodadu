/**
 * The model's calendar. Month 0 is closing. Design, permit and build run back to back; the certificate of
 * occupancy (CO) is the last build month. Operations start the month after CO, ramping over the lease-up months;
 * the first full-income month is stabilization. A sale ("sell") happens `leaseUpOrSaleMo` months after CO.
 */
import type { ProformaInputs } from "./schema";

export type Phase = "closing" | "design" | "permit" | "build" | "leaseup" | "hold" | "exit";

export interface Timeline {
  designStart: number;
  permitStart: number;
  buildStart: number;
  /** Last build month. */
  co: number;
  /** First month of operations (CO + 1). */
  opsStart: number;
  /** First full-income month (hold strategies). */
  stabilization: number;
  /** The month the property (or the unit) is sold. */
  exit: number;
  /** Total months in the model, 0..exit. */
  months: number;
}

export function timeline(i: ProformaInputs): Timeline {
  const t = i.timeline;
  const designStart = 1;
  const permitStart = designStart + t.designMo;
  const buildStart = permitStart + t.permitMo;
  const co = buildStart + t.buildMo - 1;
  const opsStart = co + 1;
  const stabilization = opsStart + t.leaseUpOrSaleMo;
  const exit = i.meta.strategy === "sell" ? co + t.leaseUpOrSaleMo : stabilization + i.growthExit.holdYears * 12 - 1;
  return { designStart, permitStart, buildStart, co, opsStart, stabilization, exit, months: exit + 1 };
}

export function phaseOf(tl: Timeline, m: number, strategy: ProformaInputs["meta"]["strategy"]): Phase {
  if (m === 0) return "closing";
  if (m === tl.exit) return "exit";
  if (m < tl.permitStart) return "design";
  if (m < tl.buildStart) return "permit";
  if (m <= tl.co) return "build";
  if (strategy === "sell" || m < tl.stabilization) return "leaseup";
  return "hold";
}

/** ISO date `months` after an ISO date, same day of month where it exists (UTC). */
export function addMonths(iso: string, months: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1 + months, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, last));
  return dt.toISOString().slice(0, 10);
}

/** Days between two ISO dates (for XIRR, actual/365). */
export const daysBetween = (fromIso: string, toIso: string): number => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
