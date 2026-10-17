import { Suspense } from "react";
import AdminLotPanel from "./AdminLotPanel";
import { ReportAccessProvider } from "@/components/report/report-access-context";

/**
 * The admin workspace: one of the shared lot views (the map or the feasibility tool, the same components the public
 * routes render) beside the admin lot panel. Reports open in full here (no paywall). `--nav-h` is set so the view's own "viewport minus header" height fills
 * this frame instead of the window.
 */
export default function AdminWorkspace({ children, offset = 210 }: { children: React.ReactNode; offset?: number }) {
  return (
    <div className="aw-grid" style={{ ["--nav-h" as string]: `${offset}px` }}>
      <div className="aw-main pencil-app">
        <ReportAccessProvider admin>
          <Suspense>{children}</Suspense>
        </ReportAccessProvider>
      </div>
      <Suspense>
        <AdminLotPanel />
      </Suspense>
    </div>
  );
}
