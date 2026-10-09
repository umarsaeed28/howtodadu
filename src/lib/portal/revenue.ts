/**
 * Revenue totals from the purchases ledger, pure, so the admin page and a test compute the same numbers.
 * Refunds are negative rows and subtract.
 */
export interface PurchaseLike {
  created_at: string;
  product: string;
  amount_cents: number;
}

export interface RevenueTotals {
  allTime: number;
  thisMonth: number;
  last30Days: number;
  last7Days: number;
  count: number;
  byProduct: { product: string; amountCents: number; count: number }[];
  /** Month by month, oldest first: "2026-10" → cents. */
  byMonth: { month: string; amountCents: number }[];
}

const DAY = 86_400_000;

export const PRODUCT_LABELS: Record<string, string> = {
  feasibility_instant: "Instant Feasibility Report",
  feasibility_reviewed: "Architect-Reviewed Feasibility",
  custom_plan: "Custom DADU Plan",
  permit: "Permit Service",
  permit_package: "Permit package (portal)",
  plan_request: "Pre-approved plan request",
  newsletter: "Newsletter subscription",
};

export function revenueTotals(rows: PurchaseLike[], now = new Date()): RevenueTotals {
  const t = now.getTime();
  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const thisMonth = monthKey(now);
  let allTime = 0, month = 0, d30 = 0, d7 = 0;
  const byProduct = new Map<string, { amountCents: number; count: number }>();
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const at = new Date(r.created_at);
    const age = t - at.getTime();
    allTime += r.amount_cents;
    if (monthKey(at) === thisMonth) month += r.amount_cents;
    if (age >= 0 && age <= 30 * DAY) d30 += r.amount_cents;
    if (age >= 0 && age <= 7 * DAY) d7 += r.amount_cents;
    const p = byProduct.get(r.product) ?? { amountCents: 0, count: 0 };
    p.amountCents += r.amount_cents;
    p.count += 1;
    byProduct.set(r.product, p);
    byMonth.set(monthKey(at), (byMonth.get(monthKey(at)) ?? 0) + r.amount_cents);
  }
  return {
    allTime,
    thisMonth: month,
    last30Days: d30,
    last7Days: d7,
    count: rows.length,
    byProduct: [...byProduct.entries()].map(([product, v]) => ({ product, ...v })).sort((a, b) => b.amountCents - a.amountCents),
    byMonth: [...byMonth.entries()].map(([m, amountCents]) => ({ month: m, amountCents })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}
