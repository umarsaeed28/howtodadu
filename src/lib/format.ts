/** Compact millions display, e.g. $1.25M / $0.74M. */
export function usdM(n: number): string {
  return `$${(n / 1_000_000).toFixed(2)}M`;
}

/** Full currency, e.g. $1,250,000. */
export function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Signed percent, e.g. +24.1%. */
export function pct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/** Plain integer with thousands separators. */
export function num(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
