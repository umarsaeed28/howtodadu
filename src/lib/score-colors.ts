/**
 * Color coding for score-based visualizations: low = red, high = green.
 */

export function getScoreStrokeClass(value: number): string {
  if (value >= 80) return "stroke-emerald-600";
  if (value >= 65) return "stroke-emerald-500";
  if (value >= 50) return "stroke-amber-500";
  if (value >= 35) return "stroke-orange-500";
  return "stroke-red-500";
}

export function getScoreBgClass(value: number): string {
  if (value >= 80) return "bg-emerald-500/90";
  if (value >= 65) return "bg-emerald-500/85";
  if (value >= 50) return "bg-amber-500/90";
  if (value >= 35) return "bg-orange-500/90";
  return "bg-red-500/90";
}

/** Green / yellow / red status for GIS panels. */
export function getScoreStatus(value: number): "green" | "yellow" | "red" {
  if (value >= 65) return "green";
  if (value >= 50) return "yellow";
  return "red";
}

export function getScoreStatusStyles(value: number): {
  badge: string;
  border: string;
} {
  const status = getScoreStatus(value);
  if (status === "green")
    return { badge: "bg-emerald-500/20 text-emerald-700 border-emerald-500/40", border: "border-l-emerald-500" };
  if (status === "yellow")
    return { badge: "bg-amber-500/20 text-amber-700 border-amber-500/40", border: "border-l-amber-500" };
  return { badge: "bg-red-500/20 text-red-700 border-red-500/40", border: "border-l-red-500" };
}
