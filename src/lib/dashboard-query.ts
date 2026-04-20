import type { DashboardPropertySlim, ConfidenceBand } from "./dashboard-normalize";

export type SortKey =
  | "address"
  | "neighborhood"
  | "interior"
  | "lot"
  | "zoning"
  | "score"
  | "confidence"
  | "status"
  | "beds"
  | "baths";

/** Workspace list filter — favorites slice only (table sorting is separate). */
export type DashboardFilters = {
  favoritesOnly: boolean;
  favoritesSet: Set<string>;
};

export function defaultFilters(): DashboardFilters {
  return {
    favoritesOnly: false,
    favoritesSet: new Set(),
  };
}

function parseBedBathDisplay(s: string): number | null {
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function applyDashboardFilters(
  rows: DashboardPropertySlim[],
  f: DashboardFilters
): DashboardPropertySlim[] {
  let list = rows;
  if (f.favoritesOnly) {
    list = list.filter((r) => f.favoritesSet.has(r.address.trim().toLowerCase()));
  }
  return list;
}

export function sortDashboardRows(
  rows: DashboardPropertySlim[],
  key: SortKey,
  dir: "asc" | "desc"
): DashboardPropertySlim[] {
  const m = dir === "asc" ? 1 : -1;
  const cmp = (a: DashboardPropertySlim, b: DashboardPropertySlim) => {
    switch (key) {
      case "address":
        return a.streetLine.localeCompare(b.streetLine, undefined, { sensitivity: "base" }) * m;
      case "neighborhood":
        return a.neighborhood.localeCompare(b.neighborhood) * m;
      case "interior":
        return (
          ((a.interiorSqftNum ?? -1) - (b.interiorSqftNum ?? -1)) * m
        );
      case "lot":
        return ((a.lotSizeSqft ?? -1) - (b.lotSizeSqft ?? -1)) * m;
      case "zoning":
        return (a.zoning ?? "").localeCompare(b.zoning ?? "") * m;
      case "score":
        return (a.daduScore - b.daduScore) * m;
      case "confidence": {
        const order: ConfidenceBand[] = ["strong", "medium", "needs_review", "low"];
        const ai = order.indexOf(a.confidenceBand);
        const bi = order.indexOf(b.confidenceBand);
        return (ai - bi) * m;
      }
      case "status":
        return (a.status === b.status ? 0 : a.status === "analyzed" ? -1 : 1) * m;
      case "beds":
        return (
          ((parseBedBathDisplay(a.bedsDisplay) ?? -1) -
            (parseBedBathDisplay(b.bedsDisplay) ?? -1)) *
          m
        );
      case "baths":
        return (
          ((parseBedBathDisplay(a.bathsDisplay) ?? -1) -
            (parseBedBathDisplay(b.bathsDisplay) ?? -1)) *
          m
        );
      default:
        return 0;
    }
  };
  return [...rows].sort(cmp);
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(length: number, pageSize: number): number {
  if (length <= 0) return 1;
  return Math.max(1, Math.ceil(length / pageSize));
}
