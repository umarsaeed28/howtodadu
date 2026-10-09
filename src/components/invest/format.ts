/** "$310K", "$1.2M": short dollars for tiles. */
export function usdShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`;
  return `${sign}$${Math.round(a)}`;
}

export const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

/** Where the listing data comes from, named for the attribution line. */
export function sourceLabel(source: string): string {
  return ({ dealmachine: "DealMachine", redfin: "Redfin", flex: "Flexmls", mlsgrid: "NWMLS via MLS Grid", fixture: "sample data" } as Record<string, string>)[source] ?? source;
}
