"use client";

import { FeasibilityDashboard } from "@/components/FeasibilityDashboard";

/**
 * Seattle DADU feasibility — bulk-first dashboard (table, filters, KPIs, favorites).
 * Single-address and CSV flows live inside {@link FeasibilityDashboard}.
 */
export function FeasibilityClient() {
  return <FeasibilityDashboard />;
}
