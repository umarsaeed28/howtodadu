/**
 * Display helpers for ADUniverse / ArcGIS values only — no ordinance math.
 */

export function fmtEm(v: string | null | undefined): string {
  if (v == null || v === "") return "—";
  return v;
}

export function fmtSqft(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString()} square feet`;
}

export function fmtSqftShort(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString()} sq ft`;
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** ArcGIS may send 0–1 or 0–100 */
export function fmtPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const pct = n <= 1 && n >= 0 ? n * 100 : n;
  return `${Number(pct.toFixed(1))}%`;
}

export function fmtFtApprox(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `approximately ${Number(n.toFixed(1))} feet`;
}

export function fmtFt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n)} feet`;
}

export function fmtYesNo(b: boolean | null | undefined): string {
  if (b == null) return "—";
  return b ? "Yes" : "No";
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}
