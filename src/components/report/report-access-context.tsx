"use client";

import { createContext, useContext } from "react";

/**
 * Who is looking at a report, set by the page around it: the admin workspace marks it as admin, so the shared report
 * view opens in full without a paywall. Anywhere else the default applies and the report's own purchase check rules.
 */
const ReportAccess = createContext<{ admin: boolean }>({ admin: false });

export function ReportAccessProvider({ admin, children }: { admin: boolean; children: React.ReactNode }) {
  return <ReportAccess.Provider value={{ admin }}>{children}</ReportAccess.Provider>;
}

export const useReportAccess = () => useContext(ReportAccess);
