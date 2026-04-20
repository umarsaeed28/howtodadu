/**
 * UI tiers for "coverage available" (buildable headroom under max lot coverage).
 * Aligns with rules-engine thresholds: <800 is constrained; <600 is severe.
 */
export const COVERAGE_AVAIL_GOOD_MIN = 800;
export const COVERAGE_AVAIL_CRITICAL_BELOW = 600;

export type CoverageAvailabilityBand = "good" | "caution" | "severe" | "unknown";

export function coverageAvailabilityBand(
  sqft: number | null | undefined
): CoverageAvailabilityBand {
  if (sqft == null || !Number.isFinite(sqft)) return "unknown";
  if (sqft >= COVERAGE_AVAIL_GOOD_MIN) return "good";
  if (sqft >= COVERAGE_AVAIL_CRITICAL_BELOW) return "caution";
  return "severe";
}

/** Short label for tooltips / aria. */
export function coverageAvailabilityHint(band: CoverageAvailabilityBand): string {
  switch (band) {
    case "good":
      return `${COVERAGE_AVAIL_GOOD_MIN}+ sq ft available — strong buildable headroom`;
    case "caution":
      return `Under ${COVERAGE_AVAIL_GOOD_MIN} sq ft available — limited headroom`;
    case "severe":
      return `Under ${COVERAGE_AVAIL_CRITICAL_BELOW} sq ft available — very tight for new footprint`;
    default:
      return "Coverage available unknown";
  }
}

/** Emphasis classes for numeric available sq ft. */
export function coverageAvailabilityValueClass(band: CoverageAvailabilityBand): string {
  switch (band) {
    case "good":
      return "text-emerald-700 dark:text-emerald-400";
    case "caution":
      return "text-amber-700 dark:text-amber-400";
    case "severe":
      return "text-red-700 dark:text-red-400";
    default:
      return "text-zinc-900 dark:text-zinc-100";
  }
}

/** Panel / card shell for lot coverage blocks (dashboard zinc theme). */
export function coverageAvailabilityPanelToneClass(band: CoverageAvailabilityBand): string {
  switch (band) {
    case "good":
      return "border-emerald-200/90 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/25";
    case "caution":
      return "border-amber-200/90 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20";
    case "severe":
      return "border-red-200/90 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/25";
    default:
      return "border-zinc-200/90 bg-zinc-50/50";
  }
}

/** Fill for the "buildable" segment in stacked coverage visuals. */
export function coverageAvailabilityBuildableBarClass(band: CoverageAvailabilityBand): string {
  switch (band) {
    case "good":
      return "bg-emerald-500/80";
    case "caution":
      return "bg-amber-500/80";
    case "severe":
      return "bg-red-500/80";
    default:
      return "bg-emerald-500/70";
  }
}

/** DADU score coloring for tables and KPIs (0–100). */
export function daduScoreClass(score: number): string {
  if (score >= 72) return "text-emerald-800 dark:text-emerald-300";
  if (score >= 48) return "text-amber-900 dark:text-amber-200";
  return "text-red-800 dark:text-red-300";
}
